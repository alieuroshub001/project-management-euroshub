// src/app/api/chat/[chatId]/media/route.ts

import { authOptions } from '@/lib/auth';
import { Message, UserChatSettings } from '@/models/Chat';
import User from '@/models/User';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// ----------------------
// Types
// ----------------------
interface SessionUser {
  id: string;
  email?: string;
}

interface SessionData {
  user: SessionUser;
}

interface IAttachment {
  url: string;
  secure_url?: string;
  public_id?: string;
  name?: string;
  original_filename?: string;
  format?: string;
  bytes?: number;
  type?: 'image' | 'video' | 'document' | 'audio';
  resource_type?: string;
  toObject: () => Omit<IAttachment, 'toObject'>;
}

// Updated RouteParams interface for Next.js 15
interface RouteParams {
  params: Promise<{
    chatId: string;
  }>;
}

// ----------------------
// Helpers
// ----------------------
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

// ----------------------
// GET Handler
// ----------------------
export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    // Await the params since they're now a Promise in Next.js 15
    const params = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isValidObjectId(params.chatId)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid chat ID' },
        { status: 400 }
      );
    }

    const { userId } = await getUserFromSession(session as SessionData);

    const userSettings = await UserChatSettings.findOne({
      chatId: params.chatId,
      userId,
    });

    if (!userSettings) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'You do not have access to this chat' },
        { status: 403 }
      );
    }

    const messages = await Message.find({
      $or: [{ channelId: params.chatId }, { conversationId: params.chatId }],
      attachments: { $exists: true, $not: { $size: 0 } },
    })
      .populate('sender', 'name email profileImage')
      .sort({ createdAt: -1 });

    const mediaFiles = messages.flatMap((message) =>
      (message.attachments as IAttachment[]).map((attachment) => ({
        messageId: message._id,
        sender: message.sender,
        createdAt: message.createdAt,
        ...attachment.toObject(),
      }))
    );

    return NextResponse.json<IApiResponse>({
      success: true,
      data: mediaFiles,
      message: 'Media files fetched successfully',
    });
  } catch (error) {
    console.error('GET media files error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to fetch media files',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}