// Enhanced Chat Types for Slack/WhatsApp-like functionality
import { Model, Document, Types } from "mongoose";
import { IUser } from "./index"; // Assuming you have a user type

// Media/Attachment types
export interface IAttachment extends Document {
  url: string;
  name: string;
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  type: 'image' | 'video' | 'audio' | 'document' | 'link';
  resource_type: string;
  thumbnailUrl?: string;
  dimensions?: {
    width?: number;
    height?: number;
  };
}

// Reaction types
export interface IReaction extends Document {
  emoji: string;
  userIds: Types.ObjectId[];
}

// Message status types
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

// Message types
export interface IMessage extends Document {
  content?: string;
  sender: Types.ObjectId | IUser;
  channelId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  attachments: IAttachment[];
  readBy: Types.ObjectId[];
  reactions: IReaction[];
  status: MessageStatus;
  replyTo?: Types.ObjectId;
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  edited: boolean;
  metadata?: {
    linkPreview?: {
      url?: string;
      title?: string;
      description?: string;
      image?: string;
      domain?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Chat types (handles both channels and direct messages)
export interface IChat extends Document {
  name?: string;
  description?: string;
  isPrivate: boolean;
  isGroup: boolean;
  createdBy: Types.ObjectId | IUser;
  members: Types.ObjectId[];
  topic?: string;
  avatar?: string;
  pinnedMessages: Types.ObjectId[];
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId | IMessage;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatDocument extends IChat {
  unreadCount?: number;
}

// Direct Message Conversation (1:1 chat)
export interface IDirectMessageConversation extends IChat {
  participants: Types.ObjectId[]; // Exactly 2 user IDs
}

// User Channel association
export interface IUserChatSettings extends Document {
  userId: Types.ObjectId;
  chatId: Types.ObjectId;
  lastRead?: Date;
  notificationsEnabled: boolean;
  muteUntil?: Date;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Typing indicator
export interface ITypingIndicator extends Document {
  userId: Types.ObjectId;
  chatId?: Types.ObjectId;
  isTyping: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Message draft
export interface IMessageDraft extends Document {
  userId: Types.ObjectId;
  chatId?: Types.ObjectId;
  content: string;
  attachments: Array<{
    url: string;
    type: 'image' | 'video' | 'audio' | 'document' | 'link';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Starred/Bookmarked messages
export interface IStarredMessage extends Document {
  userId: Types.ObjectId;
  messageId: Types.ObjectId;
  chatId?: Types.ObjectId;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Chat model with static methods
export interface IChatModel extends Model<IChatDocument> {
  findOrCreateDirectMessage(user1: string, user2: string): Promise<IChatDocument>;
  getUserChannels(userId: string): Promise<IChatDocument[]>;
  getDirectMessages(userId: string): Promise<IChatDocument[]>;
  searchMessages(userId: string, query: string): Promise<IMessage[]>;
}

// Chat search results
export interface IChatSearchResult {
  messages: IMessage[];
  channels: IChatDocument[];
  conversations: IChatDocument[];
}
