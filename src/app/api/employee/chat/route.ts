// app/api/employee/chat/route.ts - Fixed TypeScript issues with proper typing
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { 
  Chat, 
  ChatMessage, 
  ChatUnreadCount, 
  ChatTypingIndicator,
  ChatDraft 
} from '@/models/Chat';
import { 
  ChatType, 
  MessageType, 
  MessageStatus, 
  ParticipantRole,
  IAttachment,
  IChatBase,
  IChatMessageBase
} from '@/types/chat';
import { Types } from 'mongoose';

// Proper typing for chat document
interface ChatDocument {
  _id?: Types.ObjectId | string;
  id?: string;
  name?: string;
  description?: string;
  type: ChatType;
  participants: Array<{
    userId: Types.ObjectId | { _id: string; name: string; email: string; profileImage?: string; image?: string } | string;
    role: ParticipantRole;
    joinedAt: Date;
    lastRead?: Date;
    lastSeen?: Date;
    mutedUntil?: Date;
    isArchived?: boolean;
    addedBy?: Types.ObjectId | string;
  }>;
  createdBy: Types.ObjectId | string;
  admins: Types.ObjectId[] | string[];
  moderators?: Types.ObjectId[] | string[];
  avatar?: string;
  theme?: string;
  wallpaper?: string;
  isArchived: boolean;
  settings: {
    allowMemberInvites: boolean;
    allowMemberExit: boolean;
    onlyAdminsCanPost: boolean;
    messageRetention?: number;
    allowFileSharing: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    readReceipts: boolean;
    typingIndicators: boolean;
  };
  lastMessage?: {
    messageId: Types.ObjectId | string;
    content: string;
    sentAt: Date;
    senderId: Types.ObjectId | string;
    type: MessageType;
  };
  pinnedMessages: Types.ObjectId[] | string[];
  messageCount: number;
  activeParticipants: number;
  isPublic?: boolean;
  inviteLink?: string;
  inviteLinkExpiry?: Date;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  toJSON?: () => ChatDocument;
}

interface MessageDocument {
  _id?: Types.ObjectId | string;
  id?: string;
  chatId: Types.ObjectId | string;
  senderId: Types.ObjectId | string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  attachments?: IAttachment[];
  metadata?: Record<string, unknown>;
  reactions: Map<string, Types.ObjectId[]> | Record<string, Types.ObjectId[] | string[]>;
  replyTo?: Types.ObjectId | string;
  mentionedUsers?: Types.ObjectId[] | string[];
  isEdited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  deletedFor?: Types.ObjectId[] | string[];
  readBy: Map<string, Date> | Record<string, Date>;
  deliveredTo?: Types.ObjectId[] | string[];
  threadReplies?: number;
  lastThreadReplyAt?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt?: Date;
  updatedAt?: Date;
  toJSON?: () => MessageDocument;
}

// Helper function to safely convert ObjectId to string
const objectIdToString = (id: Types.ObjectId | string | undefined): string | undefined => {
  if (!id) return undefined;
  return typeof id === 'string' ? id : id.toString();
};

// Helper function to transform ObjectId to string
const transformChatForResponse = (chat: ChatDocument): IChatBase => {
  const transformed = chat.toJSON ? chat.toJSON() : chat;
  
  return {
    ...transformed,
    id: objectIdToString(transformed._id || transformed.id) || '',
    createdBy: objectIdToString(transformed.createdBy) || '',
    admins: Array.isArray(transformed.admins) 
      ? transformed.admins.map(id => objectIdToString(id) || '') 
      : [],
    moderators: Array.isArray(transformed.moderators) 
      ? transformed.moderators.map(id => objectIdToString(id) || '') 
      : [],
    participants: Array.isArray(transformed.participants) 
      ? transformed.participants.map(p => ({
          ...p,
          userId: typeof p.userId === 'object' && p.userId && '_id' in p.userId 
            ? p.userId._id 
            : objectIdToString(p.userId as unknown as Types.ObjectId) || '',
          addedBy: objectIdToString(p.addedBy)
        })) 
      : [],
    pinnedMessages: Array.isArray(transformed.pinnedMessages) 
      ? transformed.pinnedMessages.map(id => objectIdToString(id) || '') 
      : [],
    lastMessage: transformed.lastMessage ? {
      ...transformed.lastMessage,
      messageId: objectIdToString(transformed.lastMessage.messageId) || '',
      senderId: objectIdToString(transformed.lastMessage.senderId) || ''
    } : undefined,
    createdAt: transformed.createdAt || new Date(),
    updatedAt: transformed.updatedAt || new Date(),
    _id: undefined
  } as IChatBase;
};

const transformMessageForResponse = (message: MessageDocument): IChatMessageBase => {
  const transformed = message.toJSON ? message.toJSON() : message;
  
  // Handle reactions transformation
  const reactionsObj: { [emoji: string]: string[] } = {};
  if (transformed.reactions instanceof Map) {
    transformed.reactions.forEach((userIds, emoji) => {
      reactionsObj[emoji] = Array.isArray(userIds) 
        ? userIds.map(id => objectIdToString(id) || '') 
        : [];
    });
  } else if (transformed.reactions && typeof transformed.reactions === 'object') {
    Object.entries(transformed.reactions).forEach(([emoji, userIds]) => {
      reactionsObj[emoji] = Array.isArray(userIds) 
        ? userIds.map(id => objectIdToString(id) || '') 
        : [];
    });
  }

  // Handle readBy transformation
  let readByObj: { [userId: string]: Date } = {};
  if (transformed.readBy instanceof Map) {
    transformed.readBy.forEach((date, userId) => {
      readByObj[userId] = date;
    });
  } else if (transformed.readBy && typeof transformed.readBy === 'object') {
    readByObj = transformed.readBy as { [userId: string]: Date };
  }
  
  return {
    ...transformed,
    id: objectIdToString(transformed._id || transformed.id) || '',
    chatId: objectIdToString(transformed.chatId) || '',
    senderId: objectIdToString(transformed.senderId) || '',
    replyTo: objectIdToString(transformed.replyTo),
    mentionedUsers: Array.isArray(transformed.mentionedUsers) 
      ? transformed.mentionedUsers.map(id => objectIdToString(id) || '') 
      : [],
    reactions: reactionsObj,
    readBy: readByObj,
    createdAt: transformed.createdAt || new Date(),
    updatedAt: transformed.updatedAt || new Date(),
    _id: undefined
  } as IChatMessageBase;
};

// GET - Fetch user's chats or specific chat details
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const type = searchParams.get('type') as ChatType | null;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // If chatId is provided, return specific chat details
    if (chatId) {
      const chat = await Chat.findById(chatId)
        .populate('participants.userId', 'name email profileImage image')
        .populate('createdBy', 'name email profileImage image')
        .populate('lastMessage.senderId', 'name profileImage image') as ChatDocument | null;

      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      // Check if user is participant
      const isParticipant = chat.participants.some(p => {
        const userId = typeof p.userId === 'object' && p.userId && '_id' in p.userId 
          ? p.userId._id 
          : objectIdToString(p.userId as unknown as Types.ObjectId);
        return userId === session.user.id;
      });

      if (!isParticipant) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Get unread count for this user
      const unreadCount = await ChatUnreadCount.findOne({
        chatId: new Types.ObjectId(chatId),
        userId: new Types.ObjectId(session.user.id)
      });

      const transformedChat = transformChatForResponse(chat);

      return NextResponse.json({
        data: {
          ...transformedChat,
          unreadCount: unreadCount?.count || 0,
          mentionCount: unreadCount?.mentionCount || 0
        }
      });
    }

    // Get user's chats with filters
    const query: Record<string, unknown> = {
      'participants.userId': new Types.ObjectId(session.user.id),
      'participants.isArchived': { $ne: true }
    };

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const chats = await Chat.find(query)
        .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants.userId', 'name email profileImage image')
        .populate('lastMessage.senderId', 'name profileImage image')
        .lean() as unknown as ChatDocument[];

    const totalChats = await Chat.countDocuments(query);

    // Get unread counts for all chats
    const chatIds = chats.map(chat => chat._id);
    const unreadCounts = await ChatUnreadCount.find({
      chatId: { $in: chatIds },
      userId: new Types.ObjectId(session.user.id)
    }).lean();

    const unreadMap = new Map(
      unreadCounts.map(uc => [uc.chatId.toString(), uc])
    );

    const transformedChats = chats.map(chat => {
      const transformed = transformChatForResponse(chat);
      const unread = unreadMap.get((chat._id as Types.ObjectId).toString());
      
      return {
        ...transformed,
        unreadCount: unread?.count || 0,
        mentionCount: unread?.mentionCount || 0
      };
    });

    return NextResponse.json({
      data: transformedChats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalChats / limit),
        totalChats,
        hasNext: page < Math.ceil(totalChats / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST - Create new chat or send message
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create-chat':
        return await createChat(data, session.user.id);
      
      case 'send-message':
        return await sendMessage(data, session.user.id);
      
      case 'create-direct-chat':
        return await createDirectChat(data, session.user.id);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in chat POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// PUT - Update chat or message
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'update-chat':
        return await updateChat(data, session.user.id);
      
      case 'add-participants':
        return await addParticipants(data, session.user.id);
      
      case 'remove-participant':
        return await removeParticipant(data, session.user.id);
      
      case 'update-role':
        return await updateParticipantRole(data, session.user.id);
      
      case 'mark-read':
        return await markMessagesAsRead(data, session.user.id);
      
      case 'edit-message':
        return await editMessage(data, session.user.id);
      
      case 'react-message':
        return await reactToMessage(data, session.user.id);
      
      case 'pin-message':
        return await pinMessage(data, session.user.id);
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in chat PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE - Delete chat or message
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const messageId = searchParams.get('messageId');
    const action = searchParams.get('action');

    if (messageId) {
      return await deleteMessage(messageId, session.user.id, action === 'delete-for-all');
    }

    if (chatId) {
      return await deleteChat(chatId, session.user.id);
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error in chat DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}

// Helper function interfaces
interface CreateChatData {
  name?: string;
  description?: string;
  type: ChatType;
  participantIds: string[];
  isPublic?: boolean;
  settings?: Record<string, unknown>;
}

interface SendMessageData {
  chatId: string;
  content?: string;
  type?: MessageType;
  attachments?: IAttachment[];
  replyTo?: string;
  mentionedUsers?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

interface CreateDirectChatData {
  participantId: string;
}

interface UpdateChatData {
  chatId: string;
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Record<string, unknown>;
}

interface AddParticipantsData {
  chatId: string;
  participantIds: string[];
}

interface RemoveParticipantData {
  chatId: string;
  participantId: string;
}

interface UpdateParticipantRoleData {
  chatId: string;
  participantId: string;
  role: ParticipantRole;
}

interface MarkReadData {
  chatId: string;
}

interface EditMessageData {
  messageId: string;
  content: string;
}

interface ReactToMessageData {
  messageId: string;
  emoji: string;
}

interface PinMessageData {
  chatId: string;
  messageId: string;
  unpin?: boolean;
}

// Helper functions
async function createChat(data: CreateChatData, userId: string) {
  const { 
    name, 
    description, 
    type, 
    participantIds, 
    isPublic = false,
    settings = {}
  } = data;

  if (type === 'direct') {
    return NextResponse.json({ error: 'Use create-direct-chat for direct chats' }, { status: 400 });
  }

  if (!participantIds || participantIds.length === 0) {
    return NextResponse.json({ error: 'Participants are required' }, { status: 400 });
  }

  // Add creator to participants
  const allParticipantIds = [...new Set([userId, ...participantIds])];
  
  const participants = allParticipantIds.map((id, index) => ({
    userId: new Types.ObjectId(id),
    role: (index === 0 ? 'owner' : 'member') as ParticipantRole,
    joinedAt: new Date()
  }));

  const chat = new Chat({
    name,
    description,
    type: type as ChatType,
    participants,
    createdBy: new Types.ObjectId(userId),
    // FIX: Create array properly for Mongoose
    admins: [new Types.ObjectId(userId)],
    isPublic,
    activeParticipants: participants.length,
    settings: {
      allowMemberInvites: true,
      allowMemberExit: true,
      onlyAdminsCanPost: false,
      allowFileSharing: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: ['image', 'video', 'audio', 'document'],
      readReceipts: true,
      typingIndicators: true,
      ...settings
    }
  });

  await chat.save();

  // Send system message about chat creation
  const systemMessage = new ChatMessage({
    chatId: chat._id,
    senderId: new Types.ObjectId(userId),
    content: `${name || 'Chat'} was created`,
    type: 'system',
    status: 'sent',
    metadata: {
      systemAction: {
        type: 'chat_created',
        actorId: userId
      }
    }
  });

  await systemMessage.save();

  const populatedChat = await Chat.findById(chat._id)
    .populate('participants.userId', 'name email profileImage image') as ChatDocument | null;

  if (!populatedChat) {
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformChatForResponse(populatedChat),
    message: 'Chat created successfully'
  }, { status: 201 });
}

async function createDirectChat(data: CreateDirectChatData, userId: string) {
  const { participantId } = data;

  if (!participantId || participantId === userId) {
    return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
  }

  // Check if direct chat already exists
  const chat = await Chat.findOrCreateDirectChat(userId, participantId);
  
  const populatedChat = await Chat.findById(chat._id)
    .populate('participants.userId', 'name email profileImage image') as ChatDocument | null;

  if (!populatedChat) {
    return NextResponse.json({ error: 'Failed to create direct chat' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformChatForResponse(populatedChat),
    message: 'Direct chat ready'
  });
}

async function sendMessage(data: SendMessageData, userId: string) {
  const { 
    chatId, 
    content, 
    type = 'text', 
    attachments = [], 
    replyTo,
    mentionedUsers = [],
    priority = 'normal',
    metadata 
  } = data;

  const chat = await Chat.findById(chatId) as ChatDocument | null;
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Check if user can post (you'll need to implement this method on your chat model)
  // For now, assume user can post if they're a participant
  const canPost = chat.participants.some(p => 
    objectIdToString(p.userId as Types.ObjectId) === userId
  );

  if (!canPost) {
    return NextResponse.json({ error: 'Not authorized to post in this chat' }, { status: 403 });
  }

  // Validate attachments if present
  const validatedAttachments: IAttachment[] = attachments.map((att) => ({
    url: att.url || att.secure_url,
    name: att.name || att.original_filename,
    public_id: att.public_id,
    secure_url: att.secure_url || att.url,
    original_filename: att.original_filename || att.name,
    format: att.format,
    bytes: att.bytes,
    type: att.type || 'document',
    resource_type: att.resource_type || 'auto',
    width: att.width,
    height: att.height,
    duration: att.duration,
    thumbnailUrl: att.thumbnailUrl
  }));

  const message = new ChatMessage({
    chatId: new Types.ObjectId(chatId),
    senderId: new Types.ObjectId(userId),
    content: content || '',
    type: type as MessageType,
    status: 'sent' as MessageStatus,
    attachments: validatedAttachments,
    replyTo: replyTo ? new Types.ObjectId(replyTo) : undefined,
    mentionedUsers: mentionedUsers.map((id: string) => new Types.ObjectId(id)),
    priority,
    metadata
  });

  await message.save();

  // Update unread counts for other participants
  const otherParticipants = chat.participants
    .filter(p => objectIdToString(p.userId as Types.ObjectId) !== userId)
    .map(p => p.userId as Types.ObjectId);

  for (const participantId of otherParticipants) {
    const isMentioned = mentionedUsers.includes(participantId.toString());
    
    await ChatUnreadCount.findOneAndUpdate(
      { chatId: new Types.ObjectId(chatId), userId: participantId },
      { 
        $inc: { 
          count: 1,
          ...(isMentioned && { mentionCount: 1 })
        },
        $set: { lastMessageAt: new Date() }
      },
      { upsert: true }
    );
  }

  const populatedMessage = await ChatMessage.findById(message._id)
    .populate('senderId', 'name profileImage image')
    .populate('replyTo')
    .populate('mentionedUsers', 'name') as MessageDocument | null;

  if (!populatedMessage) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformMessageForResponse(populatedMessage),
    message: 'Message sent successfully'
  }, { status: 201 });
}

async function updateChat(data: UpdateChatData, userId: string) {
  const { chatId, name, description, avatar, settings } = data;

  const chat = await Chat.findById(chatId) as ChatDocument | null;
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Check if user is admin (you'll need to implement this method)
  const isAdmin = objectIdToString(chat.createdBy as Types.ObjectId) === userId ||
                  (Array.isArray(chat.admins) && chat.admins.some(adminId => 
                    objectIdToString(adminId as Types.ObjectId) === userId));

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const updateData: Partial<ChatDocument> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (settings) {
    updateData.settings = { ...chat.settings, ...settings };
  }

  const updatedChat = await Chat.findByIdAndUpdate(chatId, updateData, { new: true }) as ChatDocument | null;

  if (!updatedChat) {
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformChatForResponse(updatedChat),
    message: 'Chat updated successfully'
  });
}

async function addParticipants(data: AddParticipantsData, userId: string) {
  const { chatId, participantIds } = data;

  const chat = await Chat.addParticipants(chatId, participantIds, userId) as unknown as ChatDocument;
  
  return NextResponse.json({
    data: transformChatForResponse(chat),
    message: 'Participants added successfully'
  });
}

async function removeParticipant(data: RemoveParticipantData, userId: string) {
  const { chatId, participantId } = data;

  const chat = await Chat.findById(chatId) as ChatDocument | null;
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const isAdmin = objectIdToString(chat.createdBy as Types.ObjectId) === userId ||
                  (Array.isArray(chat.admins) && chat.admins.some(adminId => 
                    objectIdToString(adminId as Types.ObjectId) === userId));
  const isSelf = participantId === userId;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { 'participants': { userId: new Types.ObjectId(participantId) } },
      $inc: { activeParticipants: -1 }
    },
    { new: true }
  ) as ChatDocument | null;

  if (!updatedChat) {
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformChatForResponse(updatedChat),
    message: 'Participant removed successfully'
  });
}

async function updateParticipantRole(data: UpdateParticipantRoleData, userId: string) {
  const { chatId, participantId, role } = data;

  const chat = await Chat.findById(chatId) as ChatDocument | null;
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const isAdmin = objectIdToString(chat.createdBy as Types.ObjectId) === userId ||
                  (Array.isArray(chat.admins) && chat.admins.some(adminId => 
                    objectIdToString(adminId as Types.ObjectId) === userId));

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Update participant role
  const updatedChat = await Chat.findOneAndUpdate(
    { _id: chatId, 'participants.userId': new Types.ObjectId(participantId) },
    { $set: { 'participants.$.role': role } },
    { new: true }
  ) as ChatDocument | null;

  if (!updatedChat) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Update admin list based on role
  if (role === 'admin') {
    await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { admins: new Types.ObjectId(participantId) } }
    );
  } else if (role === 'member') {
    await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { admins: new Types.ObjectId(participantId) } }
    );
  }

  return NextResponse.json({
    data: transformChatForResponse(updatedChat),
    message: 'Role updated successfully'
  });
}

async function markMessagesAsRead(data: MarkReadData, userId: string) {
  const { chatId } = data;

  await ChatMessage.markMessagesAsRead(chatId, userId);

  return NextResponse.json({
    message: 'Messages marked as read'
  });
}

async function editMessage(data: EditMessageData, userId: string) {
  const { messageId, content } = data;

  const message = await ChatMessage.findById(messageId) as MessageDocument | null;
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  // Check if user can edit (sender can edit within 15 minutes)
  const canEdit = objectIdToString(message.senderId as Types.ObjectId) === userId;
  if (!canEdit) {
    return NextResponse.json({ error: 'Cannot edit this message' }, { status: 403 });
  }

  const updatedMessage = await ChatMessage.findByIdAndUpdate(
    messageId,
    {
      content,
      isEdited: true,
      editedAt: new Date()
    },
    { new: true }
  ) as MessageDocument | null;

  if (!updatedMessage) {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformMessageForResponse(updatedMessage),
    message: 'Message updated successfully'
  });
}

async function reactToMessage(data: ReactToMessageData, userId: string) {
  const { messageId, emoji } = data;

  const message = await ChatMessage.findById(messageId) as MessageDocument | null;
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  // Handle reaction logic (you'll need to implement addReaction method or do it here)
  const reactions = message.reactions instanceof Map ? message.reactions : new Map();
  
  if (!reactions.has(emoji)) {
    reactions.set(emoji, []);
  }
  
  const currentReactions = reactions.get(emoji) || [];
  const userObjectId = new Types.ObjectId(userId);
  const existingIndex = currentReactions.findIndex((id: Types.ObjectId) => 
    (id as Types.ObjectId).equals(userObjectId)
  );
  
  if (existingIndex > -1) {
    currentReactions.splice(existingIndex, 1);
  } else {
    currentReactions.push(userObjectId);
  }
  
  reactions.set(emoji, currentReactions);

  const updatedMessage = await ChatMessage.findByIdAndUpdate(
    messageId,
    { reactions },
    { new: true }
  ) as MessageDocument | null;

  if (!updatedMessage) {
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
  }

  return NextResponse.json({
    data: transformMessageForResponse(updatedMessage),
    message: 'Reaction updated'
  });
}

async function pinMessage(data: PinMessageData, userId: string) {
  const { chatId, messageId, unpin = false } = data;

  const chat = await Chat.findById(chatId) as ChatDocument | null;
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const isAdmin = objectIdToString(chat.createdBy as Types.ObjectId) === userId ||
                  (Array.isArray(chat.admins) && chat.admins.some(adminId => 
                    objectIdToString(adminId as Types.ObjectId) === userId));

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const updateOperation = unpin 
    ? { $pull: { pinnedMessages: new Types.ObjectId(messageId) } }
    : { $addToSet: { pinnedMessages: new Types.ObjectId(messageId) } };

  await Chat.findByIdAndUpdate(chatId, updateOperation);

  return NextResponse.json({
    message: unpin ? 'Message unpinned' : 'Message pinned'
  });
}

async function deleteMessage(messageId: string, userId: string, deleteForAll: boolean = false) {
  const message = await ChatMessage.findById(messageId) as MessageDocument | null;
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  if (deleteForAll) {
    const canDelete = objectIdToString(message.senderId as Types.ObjectId) === userId;
    if (!canDelete) {
      return NextResponse.json({ error: 'Cannot delete this message' }, { status: 403 });
    }
    
    await ChatMessage.findByIdAndUpdate(messageId, {
      deleted: true,
      deletedAt: new Date(),
      content: 'This message was deleted',
      attachments: []
    });
  } else {
    // Delete for self only
    await ChatMessage.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: new Types.ObjectId(userId) }
    });
  }

  return NextResponse.json({
    message: deleteForAll ? 'Message deleted for everyone' : 'Message deleted for you'
  });
}

async function deleteChat(chatId: string, userId: string) {
  const chat = await Chat.findById(chatId) as ChatDocument | null;
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const isOwner = objectIdToString(chat.createdBy as Types.ObjectId) === userId;
  const isDirectChat = chat.type === 'direct';

  if (!isOwner && !isDirectChat) {
    return NextResponse.json({ error: 'Only chat owner can delete this chat' }, { status: 403 });
  }

  if (isDirectChat) {
    // For direct chats, just remove the user from participants
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { 'participants': { userId: new Types.ObjectId(userId) } },
        $inc: { activeParticipants: -1 }
      },
      { new: true }
    ) as ChatDocument | null;
    
    if (updatedChat && updatedChat.participants.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      await ChatMessage.deleteMany({ chatId });
      await ChatUnreadCount.deleteMany({ chatId });
    }
  } else {
    // Delete the entire chat and all related data
    await Chat.findByIdAndDelete(chatId);
    await ChatMessage.deleteMany({ chatId: new Types.ObjectId(chatId) });
    await ChatUnreadCount.deleteMany({ chatId: new Types.ObjectId(chatId) });
    await ChatTypingIndicator.deleteMany({ chatId: new Types.ObjectId(chatId) });
    await ChatDraft.deleteMany({ chatId: new Types.ObjectId(chatId) });
  }

  return NextResponse.json({
    message: 'Chat deleted successfully'
  });
}