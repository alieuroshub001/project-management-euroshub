// app/api/chat/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import { Chat, Message, UserChatSettings } from '@/models/Chat';

interface SessionUser {
  id: string;
  email?: string;
  role?: string;
}

interface SessionData {
  user: SessionUser;
}

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

// Helper function to get user by session
async function getUserFromSession(session: SessionData) {
  console.log('Getting user from session:', session.user);
  
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

// Get all chats (channels and DMs) for the current user
export async function GET() {
  try {
    console.log('GET /api/chat - Starting request');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized',
        data: []
      }, { status: 401 });
    }

    await connectToDatabase();
    console.log('Database connected');

    const { userId } = await getUserFromSession(session as SessionData);
    console.log('User ID:', userId);

    // Get channels where user is a member
    const channels = await Chat.find({
      isGroup: true,
      members: userId
    })
    .populate('lastMessage')
    .populate('createdBy', 'name email profileImage')
    .populate('members', 'name email profileImage')
    .sort({ updatedAt: -1 })
    .lean();

    console.log('Found channels:', channels?.length || 0);

    // Get direct messages where user is a participant
    const directMessages = await Chat.find({
      isGroup: false,
      participants: userId
    })
    .populate('lastMessage')
    .populate('participants', 'name email profileImage')
    .populate('createdBy', 'name email profileImage')
    .sort({ updatedAt: -1 })
    .lean();

    console.log('Found direct messages:', directMessages?.length || 0);

    // Combine and process results
    const allChats = [...(channels || []), ...(directMessages || [])];
    
    const chatsWithSettings = await Promise.all(
      allChats.map(async (chat) => {
        try {
          const settings = await UserChatSettings.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            chatId: chat._id
          });
          
          const unreadCount = settings?.lastRead 
            ? await Message.countDocuments({
                $or: [
                  { channelId: chat._id },
                  { conversationId: chat._id }
                ],
                createdAt: { $gt: settings.lastRead }
              })
            : 0;

          return {
            ...chat,
            _id: chat._id.toString(),
            unreadCount,
            notificationsEnabled: settings?.notificationsEnabled ?? true,
            isFavorite: settings?.isFavorite ?? false
          };
        } catch (error) {
          console.error('Error processing chat:', chat._id, error);
          return {
            ...chat,
            _id: chat._id.toString(),
            unreadCount: 0,
            notificationsEnabled: true,
            isFavorite: false
          };
        }
      })
    );

    console.log('Processed chats:', chatsWithSettings.length);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: chatsWithSettings,
      message: `${chatsWithSettings.length} chats fetched successfully`
    });

  } catch (error) {
    console.error('GET chats error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch chats',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }, { status: 500 });
  }
}

// Create a new channel or direct message
export async function POST(request: Request) {
  try {
    console.log('POST /api/chat - Starting request');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      name, 
      description, 
      isPrivate, 
      members, 
      isDirectMessage, 
      recipientId 
    } = body;

    const { userId } = await getUserFromSession(session as SessionData);
    console.log('Creating chat for user:', userId);

    if (isDirectMessage) {
      // Handle direct message creation
      if (!recipientId || !isValidObjectId(recipientId)) {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'Valid recipient ID is required for direct messages'
        }, { status: 400 });
      }

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'Recipient not found'
        }, { status: 404 });
      }

      // Check if DM already exists
      const existingDM = await Chat.findOne({
        isGroup: false,
        participants: { 
          $all: [userId, recipientId],
          $size: 2 
        }
      });

      if (existingDM) {
        console.log('Found existing DM:', existingDM._id);
        return NextResponse.json<IApiResponse>({
          success: true,
          data: existingDM,
          message: 'Direct message conversation found'
        });
      }

      // Create new DM
      const dm = await Chat.create({
        isGroup: false,
        isPrivate: true,
        createdBy: userId,
        participants: [userId, recipientId],
        members: [userId, recipientId]
      });

      // Create user settings for both participants
      await UserChatSettings.create([
        {
          userId: userId,
          chatId: dm._id,
          notificationsEnabled: true
        },
        {
          userId: recipientId,
          chatId: dm._id,
          notificationsEnabled: true
        }
      ]);

      console.log('Created DM:', dm._id);
      
      return NextResponse.json<IApiResponse>({
        success: true,
        data: dm,
        message: 'Direct message conversation created successfully'
      });
      
    } else {
      // Handle channel creation
      if (!name || !name.trim()) {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'Channel name is required'
        }, { status: 400 });
      }

      // Process member list
      const validMemberIds: string[] = [userId];
      if (Array.isArray(members)) {
        for (const memberId of members) {
          if (isValidObjectId(memberId) && memberId !== userId) {
            // Verify member exists
            const memberExists = await User.findById(memberId);
            if (memberExists) {
              validMemberIds.push(memberId);
            } else {
              console.log('Member not found:', memberId);
            }
          }
        }
      }

      console.log('Valid member IDs:', validMemberIds);

      const channel = await Chat.create({
        name: name.trim(),
        description: description?.trim() || '',
        isPrivate: isPrivate || false,
        isGroup: true,
        createdBy: userId,
        members: validMemberIds
      });

      console.log('Created channel:', channel._id);

      // Create user settings for all members
      const settingsPromises = validMemberIds.map(memberId => 
        UserChatSettings.create({
          userId: memberId,
          chatId: channel._id,
          notificationsEnabled: true
        }).catch(err => {
          console.error(`Failed to create settings for user ${memberId}:`, err);
        })
      );

      await Promise.all(settingsPromises);

      return NextResponse.json<IApiResponse>({
        success: true,
        data: channel,
        message: 'Channel created successfully'
      });
    }

  } catch (error) {
    console.error('POST chat error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to create chat',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}