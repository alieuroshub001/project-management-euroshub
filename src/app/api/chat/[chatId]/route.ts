// app/api/chat/[chatId]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Chat, Message, UserChatSettings } from '@/models/Chat';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';

interface SessionUser {
  id: string;
  email?: string;
}

interface SessionData {
  user: SessionUser;
}

// Shared Attachment interface
export interface IAttachment {
  url: string;
  secure_url?: string;
  public_id?: string;
  name?: string;
  original_filename?: string;
  format?: string;
  bytes?: number;
  type?: 'image' | 'video' | 'document' | 'audio';
  resource_type?: string;
}

// Helper functions
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

async function getUserFromSession(session: SessionData) {
  if (isValidObjectId(session.user.id)) {
    return { userId: session.user.id };
  }

  if (session.user.email) {
    const user = await User.findOne({ email: session.user.email }).select('_id');
    if (user) {
      return { userId: user._id.toString() };
    }
  }

  throw new Error('User not found in database');
}

// Get chat details and messages
export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    console.log('GET /api/chat/[chatId] - Starting request for:', params.chatId);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isValidObjectId(params.chatId)) {
      console.log('Invalid chat ID:', params.chatId);
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid chat ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { userId } = await getUserFromSession(session as SessionData);
    console.log('User ID:', userId);

    // First check if the chat exists and user has access
    const chat = await Chat.findById(params.chatId);
    if (!chat) {
      console.log('Chat not found:', params.chatId);
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    // Check if user is a member or participant
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasAccess = chat.members.includes(userObjectId) || 
                     chat.participants.includes(userObjectId);

    if (!hasAccess) {
      console.log('User does not have access to chat');
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'You do not have access to this chat' },
        { status: 403 }
      );
    }

    // Create or update user settings if they don't exist
    let userSettings = await UserChatSettings.findOne({
      chatId: params.chatId,
      userId: userObjectId,
    });

    if (!userSettings) {
      console.log('Creating user settings for chat access');
      userSettings = await UserChatSettings.create({
        userId: userObjectId,
        chatId: params.chatId,
        notificationsEnabled: true,
        isFavorite: false
      });
    }

    // Get populated chat details
    const populatedChat = await Chat.findById(params.chatId)
      .populate('createdBy', 'name email profileImage')
      .populate('members', 'name email profileImage')
      .populate('participants', 'name email profileImage')
      .populate('lastMessage');

    // Pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    console.log('Fetching messages for chat:', params.chatId);

    const messages = await Message.find({
      $or: [
        { channelId: params.chatId }, 
        { conversationId: params.chatId }
      ],
      deleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email profileImage')
      .populate('replyTo', 'content sender')
      .lean();

    console.log('Found messages:', messages?.length || 0);

    // Update last read timestamp
    userSettings.lastRead = new Date();
    await userSettings.save();

    const totalMessages = await Message.countDocuments({
      $or: [
        { channelId: params.chatId }, 
        { conversationId: params.chatId }
      ],
      deleted: { $ne: true }
    });

    return NextResponse.json<IApiResponse>({
      success: true,
      data: {
        chat: populatedChat,
        messages: messages.reverse(), // Return in chronological order
        page,
        limit,
        total: totalMessages,
        unreadCount: 0,
      },
      message: 'Chat data fetched successfully',
    });
    
  } catch (error) {
    console.error('GET chat details error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to fetch chat details',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Post a new message to the chat
export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    console.log('POST /api/chat/[chatId] - Starting message creation for:', params.chatId);
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content, attachments, replyTo } = (await request.json()) as {
      content?: string;
      attachments?: IAttachment[];
      replyTo?: string;
    };

    console.log('Message data:', { content, attachments: attachments?.length, replyTo });

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Message content or attachments are required' },
        { status: 400 }
      );
    }

    if (!isValidObjectId(params.chatId)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid chat ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { userId } = await getUserFromSession(session as SessionData);
    console.log('Sending message from user:', userId);

    // Check if chat exists and user has access
    const chat = await Chat.findById(params.chatId);
    if (!chat) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasAccess = chat.members.includes(userObjectId) || 
                     chat.participants.includes(userObjectId);

    if (!hasAccess) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'You do not have access to this chat' },
        { status: 403 }
      );
    }

    // Create the message
    const messageData: any = {
      content: content?.trim(),
      sender: userId,
      attachments: attachments || [],
      status: 'sent'
    };

    // Set channelId for group chats, conversationId for DMs
    if (chat.isGroup) {
      messageData.channelId = params.chatId;
    } else {
      messageData.conversationId = params.chatId;
    }

    if (replyTo && isValidObjectId(replyTo)) {
      messageData.replyTo = replyTo;
    }

    console.log('Creating message with data:', messageData);

    const message = await Message.create(messageData);

    // Update chat's last message and timestamp
    await Chat.findByIdAndUpdate(params.chatId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    // Populate sender info for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email profileImage')
      .populate('replyTo', 'content sender');

    console.log('Message created successfully:', message._id);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedMessage,
      message: 'Message sent successfully',
    });
    
  } catch (error) {
    console.error('POST message error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to send message',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Update chat settings
export async function PUT(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { notificationsEnabled, isFavorite, muteUntil } =
      (await request.json()) as {
        notificationsEnabled?: boolean;
        isFavorite?: boolean;
        muteUntil?: Date;
      };

    if (!isValidObjectId(params.chatId)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid chat ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { userId } = await getUserFromSession(session as SessionData);

    const userSettings = await UserChatSettings.findOneAndUpdate(
      { chatId: params.chatId, userId },
      { 
        notificationsEnabled: notificationsEnabled ?? true,
        isFavorite: isFavorite ?? false,
        muteUntil 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json<IApiResponse>({
      success: true,
      data: userSettings,
      message: 'Chat settings updated successfully',
    });
    
  } catch (error) {
    console.error('PUT chat settings error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to update chat settings',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}