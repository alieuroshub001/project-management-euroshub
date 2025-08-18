// types/chat.ts - Fixed Chat Types with proper Mongoose array types
import { Types } from 'mongoose';

export type ChatType = 'direct' | 'group' | 'channel' | 'announcement';
export type MessageType = 'text' | 'image' | 'file' | 'video' | 'audio' | 'system' | 'location' | 'contact' | 'poll' | 'reply' | 'forward';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ParticipantRole = 'member' | 'admin' | 'owner' | 'moderator';

// Enhanced attachment interface
export interface IAttachment {
  url: string;
  name: string;
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  type: 'image' | 'video' | 'audio' | 'document';
  resource_type: string;
  width?: number; // For images/videos
  height?: number; // For images/videos
  duration?: number; // For audio/video in seconds
  thumbnailUrl?: string; // Cloudinary thumbnail for videos
}

// System action data interface
export interface ISystemActionData {
  oldName?: string;
  newName?: string;
  oldAvatar?: string;
  newAvatar?: string;
  [key: string]: unknown;
}

// Message metadata for different types
export interface IMessageMetadata {
  // For location messages
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string; // Place name
  };
  
  // For contact messages
  contact?: {
    name: string;
    phoneNumbers?: string[];
    emails?: string[];
  };
  
  // For poll messages
  poll?: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    votes: {
      [optionIndex: number]: string[]; // userIds who voted for this option
    };
  };
  
  // For system messages
  systemAction?: {
    type: 'user_joined' | 'user_left' | 'user_added' | 'user_removed' | 'chat_created' | 'name_changed' | 'avatar_changed';
    actorId?: string;
    targetIds?: string[];
    data?: ISystemActionData;
  };
  
  // For forwarded messages
  forwarded?: {
    originalMessageId: string;
    originalChatId: string;
    originalSenderId: string;
    forwardedAt: Date;
  };
}

// Enhanced participant interface for Mongoose documents
export interface IChatParticipant {
  userId: Types.ObjectId;
  role: ParticipantRole;
  joinedAt: Date;
  lastRead?: Date;
  lastSeen?: Date; // When user was last active in chat
  mutedUntil?: Date;
  pinnedMessages?: Types.ObjectId[]; // Regular array instead of Types.Array
  customNotificationSettings?: {
    muted: boolean;
    mentions: boolean;
    replies: boolean;
  };
  isArchived?: boolean; // User archived this chat
  addedBy?: Types.ObjectId; // Who added this user
}

// Enhanced message interface for Mongoose documents
export interface IChatMessage {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  type: MessageType;
  status: MessageStatus;
  
  // Enhanced message features
  attachments?: IAttachment[];
  metadata?: IMessageMetadata;
  
  // Message interactions
  reactions: Map<string, Types.ObjectId[]>; // emoji -> userIds
  replyTo?: Types.ObjectId;
  mentionedUsers?: Types.ObjectId[]; // Regular array instead of Types.Array
  
  // Message state
  isEdited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  deletedFor?: Types.ObjectId[]; // Regular array instead of Types.Array
  
  // Message visibility and delivery
  readBy: Map<string, Date>; // userId -> readAt timestamp
  deliveredTo?: Types.ObjectId[]; // Regular array instead of Types.Array
  
  // Thread support (like Slack)
  threadReplies?: number; // Count of thread replies
  lastThreadReplyAt?: Date;
  
  // Message priority/importance (like Slack's urgent messages)
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// Enhanced chat interface for Mongoose documents
export interface IChat {
  name?: string;
  description?: string;
  type: ChatType;
  participants: IChatParticipant[]; // Regular array instead of Types.DocumentArray
  createdBy: Types.ObjectId;
  
  // Enhanced chat management
  admins: Types.ObjectId[]; // Regular array instead of Types.Array
  moderators?: Types.ObjectId[]; // Regular array instead of Types.Array
  
  // Chat appearance
  avatar?: string;
  theme?: string; // Chat theme/color
  wallpaper?: string; // Chat background
  
  // Chat settings
  isArchived: boolean;
  settings: {
    allowMemberInvites: boolean;
    allowMemberExit: boolean;
    onlyAdminsCanPost: boolean; // For announcement channels
    messageRetention?: number; // Days to keep messages
    allowFileSharing: boolean;
    maxFileSize: number; // In bytes
    allowedFileTypes: string[];
    readReceipts: boolean;
    typingIndicators: boolean;
  };
  
  // Chat metadata
  lastMessage?: {
    messageId: Types.ObjectId;
    content: string;
    sentAt: Date;
    senderId: Types.ObjectId;
    type: MessageType;
  };
  pinnedMessages: Types.ObjectId[]; // Regular array instead of Types.Array
  
  // Chat statistics
  messageCount: number;
  activeParticipants: number; // Participants who haven't left
  
  // For channels/public groups
  isPublic?: boolean;
  inviteLink?: string;
  inviteLinkExpiry?: Date;
  tags?: string[]; // For categorizing channels
}

// Typing indicator interface
export interface IChatTypingIndicator {
  chatId: Types.ObjectId;
  userId: Types.ObjectId;
  isTyping: boolean;
  lastActive: Date;
}

// Unread count interface
export interface IChatUnreadCount {
  chatId: Types.ObjectId;
  userId: Types.ObjectId;
  count: number;
  lastMessageAt?: Date;
  mentionCount?: number; // Separate count for mentions
}

// Message draft interface (like Slack/WhatsApp drafts)
export interface IChatDraft {
  chatId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  attachments?: IAttachment[];
  replyTo?: Types.ObjectId;
  updatedAt: Date;
}

// Call/Video call interface (like WhatsApp calls)
export interface IChatCall {
  chatId: Types.ObjectId;
  initiatedBy: Types.ObjectId;
  participants: Types.ObjectId[];
  type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // In seconds
}

// Message thread interface (like Slack threads)
export interface IChatThread {
  originalMessageId: Types.ObjectId;
  chatId: Types.ObjectId;
  participants: Types.ObjectId[]; // Users who participated in thread
  lastReplyAt: Date;
  replyCount: number;
}

// Chat folder/label interface (like Gmail labels for organizing chats)
export interface IChatFolder {
  userId: Types.ObjectId;
  name: string;
  chatIds: Types.ObjectId[];
  color?: string;
  icon?: string;
}

// Base interfaces for API responses (with string IDs instead of ObjectIds)
export interface IChatParticipantBase {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastRead?: Date;
  lastSeen?: Date;
  mutedUntil?: Date;
  customNotificationSettings?: {
    muted: boolean;
    mentions: boolean;
    replies: boolean;
  };
  isArchived?: boolean;
  addedBy?: string;
}

export interface IChatMessageBase {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  attachments?: IAttachment[];
  metadata?: IMessageMetadata;
  reactions?: {
    [emoji: string]: string[]; // userIds who reacted with this emoji
  };
  replyTo?: string; // messageId being replied to
  mentionedUsers?: string[];
  isEdited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  readBy?: {
    [userId: string]: Date; // userId -> readAt timestamp
  };
  threadReplies?: number;
  lastThreadReplyAt?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatBase {
  id: string;
  name?: string;
  description?: string;
  type: ChatType;
  participants: IChatParticipantBase[];
  createdBy: string;
  admins: string[];
  moderators?: string[];
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
    messageId: string;
    content: string;
    sentAt: Date;
    senderId: string;
    type: MessageType;
  };
  pinnedMessages: string[];
  messageCount: number;
  activeParticipants: number;
  isPublic?: boolean;
  inviteLink?: string;
  inviteLinkExpiry?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}