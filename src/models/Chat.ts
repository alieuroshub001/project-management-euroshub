// models/Chat.ts
import mongoose, { Schema, Model, Document } from 'mongoose';
import { IUser } from '@/types';

// Attachment Schema (reusable)
const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  public_id: { type: String, required: true },
  secure_url: { type: String, required: true },
  original_filename: { type: String, required: true },
  format: { type: String, required: true },
  bytes: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['image', 'video', 'audio', 'document', 'link'],
    required: true 
  },
  resource_type: { type: String, required: true },
  thumbnailUrl: { type: String },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  }
}, { _id: false });

// Reaction Schema (subdocument)
const ReactionSchema = new Schema({
  emoji: { type: String, required: true },
  userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

// Message Schema
const MessageSchema = new Schema({
  content: { type: String },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channelId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  attachments: [AttachmentSchema],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reactions: [ReactionSchema],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  edited: { type: Boolean, default: false },
  metadata: {
    linkPreview: {
      url: { type: String },
      title: { type: String },
      description: { type: String },
      image: { type: String },
      domain: { type: String }
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true }
});

// Chat Schema (handles both channels and direct messages)
const ChatSchema = new Schema({
  name: { type: String },
  description: { type: String },
  isPrivate: { type: Boolean, default: false },
  isGroup: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  topic: { type: String },
  avatar: { type: String },
  pinnedMessages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' }
}, { 
  timestamps: true
});

// User Chat Settings Schema
const UserChatSettingsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  lastRead: { type: Date },
  notificationsEnabled: { type: Boolean, default: true },
  muteUntil: { type: Date },
  isFavorite: { type: Boolean, default: false }
}, { timestamps: true });

// Typing Indicator Schema
const TypingIndicatorSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  isTyping: { type: Boolean, required: true },
  lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

// Message Draft Schema
const MessageDraftSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  content: { type: String, required: true },
  attachments: [{
    url: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['image', 'video', 'audio', 'document', 'link'],
      required: true 
    }
  }]
}, { timestamps: true });

// Starred Message Schema
const StarredMessageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  tags: [{ type: String }]
}, { timestamps: true });

// Interfaces
interface IAttachment extends Document {
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

interface IReaction extends Document {
  emoji: string;
  userIds: mongoose.Types.ObjectId[];
}

interface IMessage extends Document {
  content?: string;
  sender: mongoose.Types.ObjectId | IUser;
  channelId?: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  attachments: IAttachment[];
  readBy: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  status: 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: mongoose.Types.ObjectId;
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
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

interface IChat extends Document {
  name?: string;
  description?: string;
  isPrivate: boolean;
  isGroup: boolean;
  createdBy: mongoose.Types.ObjectId | IUser;
  members: mongoose.Types.ObjectId[];
  topic?: string;
  avatar?: string;
  pinnedMessages: mongoose.Types.ObjectId[];
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId | IMessage;
  createdAt: Date;
  updatedAt: Date;
}

interface IChatDocument extends IChat {
  unreadCount?: number;
}

interface IUserChatSettings extends Document {
  userId: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  lastRead?: Date;
  notificationsEnabled: boolean;
  muteUntil?: Date;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ITypingIndicator extends Document {
  userId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  isTyping: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IMessageDraft extends Document {
  userId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  content: string;
  attachments: Array<{
    url: string;
    type: 'image' | 'video' | 'audio' | 'document' | 'link';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface IStarredMessage extends Document {
  userId: mongoose.Types.ObjectId;
  messageId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
interface IChatModel extends Model<IChatDocument> {
  findOrCreateDirectMessage(user1: string, user2: string): Promise<IChatDocument>;
  getUserChannels(userId: string): Promise<IChatDocument[]>;
  getDirectMessages(userId: string): Promise<IChatDocument[]>;
  searchMessages(userId: string, query: string): Promise<IMessage[]>;
}

// Implement static methods
ChatSchema.statics.findOrCreateDirectMessage = async function(
  user1: string, 
  user2: string
): Promise<IChatDocument> {
  const participants = [user1, user2].sort();
  
  let chat = await this.findOne({
    isGroup: false,
    participants: { $all: participants, $size: 2 }
  }).populate('lastMessage');
  
  if (!chat) {
    chat = await this.create({
      isGroup: false,
      isPrivate: true,
      createdBy: participants[0],
      participants,
      members: participants
    });
  }
  
  return chat;
};

ChatSchema.statics.getUserChannels = function(
  userId: string
): Promise<IChatDocument[]> {
  return this.find({
    isGroup: true,
    members: userId
  })
  .populate('lastMessage')
  .populate('createdBy', 'name email profileImage')
  .populate('members', 'name email profileImage')
  .sort({ updatedAt: -1 })
  .exec();
};

ChatSchema.statics.getDirectMessages = function(
  userId: string
): Promise<IChatDocument[]> {
  return this.find({
    isGroup: false,
    participants: userId
  })
  .populate('lastMessage')
  .populate('participants', 'name email profileImage')
  .populate('createdBy', 'name email profileImage')
  .sort({ updatedAt: -1 })
  .exec();
};

ChatSchema.statics.searchMessages = function(
  userId: string, 
  query: string
): Promise<IMessage[]> {
  return this.aggregate([
    {
      $match: {
        $or: [
          { members: new mongoose.Types.ObjectId(userId) },
          { participants: new mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $lookup: {
        from: 'messages',
        let: { chatId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$channelId', '$$chatId'] },
                  { $eq: ['$conversationId', '$$chatId'] }
                ]
              },
              content: { $regex: query, $options: 'i' }
            }
          }
        ],
        as: 'messages'
      }
    },
    {
      $unwind: '$messages'
    },
    {
      $replaceRoot: { newRoot: '$messages' }
    }
  ]).exec();
};

// Validation middleware
ChatSchema.pre('save', function(next) {
  if (!this.isGroup && this.participants.length !== 2) {
    return next(new Error('Direct messages must have exactly 2 participants'));
  }
  next();
});

MessageSchema.pre('save', function(next) {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    return next(new Error('Message must have either content or attachments'));
  }
  next();
});

// Indexes for optimal performance
ChatSchema.index({ isGroup: 1 });
ChatSchema.index({ members: 1 });
ChatSchema.index({ participants: 1 });
ChatSchema.index({ isGroup: 1, members: 1 });
ChatSchema.index({ isGroup: 1, participants: 1 });
ChatSchema.index({ lastMessage: 1 });
ChatSchema.index({ updatedAt: -1 });

MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ 'attachments.type': 1 });
MessageSchema.index({ content: 'text' });

UserChatSettingsSchema.index({ userId: 1, chatId: 1 }, { unique: true });
UserChatSettingsSchema.index({ userId: 1, isFavorite: 1 });

TypingIndicatorSchema.index({ chatId: 1, userId: 1 }, { unique: true });
TypingIndicatorSchema.index({ lastActive: 1 });

StarredMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
StarredMessageSchema.index({ userId: 1, tags: 1 });

// Create models with proper model checking
const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

const Chat = (mongoose.models.Chat as IChatModel) || 
  mongoose.model<IChatDocument, IChatModel>('Chat', ChatSchema);

const UserChatSettings = mongoose.models.UserChatSettings || 
  mongoose.model<IUserChatSettings>('UserChatSettings', UserChatSettingsSchema);

const TypingIndicator = mongoose.models.TypingIndicator || 
  mongoose.model<ITypingIndicator>('TypingIndicator', TypingIndicatorSchema);

const MessageDraft = mongoose.models.MessageDraft || 
  mongoose.model<IMessageDraft>('MessageDraft', MessageDraftSchema);

const StarredMessage = mongoose.models.StarredMessage || 
  mongoose.model<IStarredMessage>('StarredMessage', StarredMessageSchema);

export { 
  Chat, 
  Message, 
  UserChatSettings, 
  TypingIndicator, 
  MessageDraft, 
  StarredMessage,
  type IChatDocument,
  type IMessage,
  type IAttachment,
  type IReaction,
  type IUserChatSettings,
  type ITypingIndicator,
  type IMessageDraft,
  type IStarredMessage,
  type IChatModel
};