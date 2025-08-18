// app/api/chat/[chatId]/typing/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TypingIndicator, UserChatSettings } from '@/models/Chat';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';
import  User  from '@/models/User';

interface SessionUser {
  id: string;
  email?: string;
}

interface SessionData {
  user: SessionUser;
}

// Helper functions (same as above)
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

// Update typing indicator
export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const { isTyping } = await request.json() as {
      isTyping: boolean;
    };

    if (!isValidObjectId(params.chatId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid chat ID'
      }, { status: 400 });
    }

    const { userId } = await getUserFromSession(session as SessionData);

    // Verify user has access to the chat
    const userSettings = await UserChatSettings.findOne({
      chatId: params.chatId,
      userId
    });
    
    if (!userSettings) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this chat'
      }, { status: 403 });
    }

    // Update or create typing indicator
    const typingIndicator = await TypingIndicator.findOneAndUpdate(
      { userId, chatId: params.chatId },
      { isTyping, lastActive: new Date() },
      { upsert: true, new: true }
    ).populate('userId', 'name email profileImage');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: typingIndicator,
      message: 'Typing status updated'
    });

  } catch (error) {
    console.error('POST typing indicator error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to update typing status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get active typing indicators for a chat
export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.chatId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid chat ID'
      }, { status: 400 });
    }

    const { userId } = await getUserFromSession(session as SessionData);

    // Verify user has access to the chat
    const userSettings = await UserChatSettings.findOne({
      chatId: params.chatId,
      userId
    });
    
    if (!userSettings) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this chat'
      }, { status: 403 });
    }

    // Get active typing indicators (within last 5 seconds)
    const activeTyping = await TypingIndicator.find({
      chatId: params.chatId,
      isTyping: true,
      lastActive: { $gte: new Date(Date.now() - 5000) },
      userId: { $ne: userId } // Don't return the current user's typing status
    })
    .populate('userId', 'name email profileImage');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: activeTyping,
      message: 'Active typing indicators fetched'
    });

  } catch (error) {
    console.error('GET typing indicators error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch typing indicators',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}