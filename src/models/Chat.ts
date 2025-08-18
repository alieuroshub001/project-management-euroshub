// models/Chat.ts - Fixed Chat Mongoose Models with proper array types
import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import {
  IChat,
  IChatParticipant,
  IChatMessage,
  IChatUnreadCount,
  IChatTypingIndicator,
  IChatDraft,
  IChatCall,
  IChatThread,
  IChatFolder,
  ChatType,
  MessageType,
  MessageStatus,
  ParticipantRole,
  IAttachment,
  IMessageMetadata
} from '@/types/chat';

// Clean up existing models to avoid conflicts
const modelsToClean = [
  'Chat', 'ChatMessage', 'ChatUnreadCount', 'ChatTypingIndicator', 
  'ChatDraft', 'ChatCall', 'ChatThread', 'ChatFolder'
];

modelsToClean.forEach(modelName => {
  if (mongoose.models[modelName]) {
    delete mongoose.models[modelName];
  }
});

// Define proper transform function types
interface TransformReturnType {
  id: string;
  [key: string]: unknown;
}

// Document interfaces extending Mongoose Document with timestamps
interface IChatDoc extends IChat, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  isUserAdmin(userId: string): boolean;
  isUserModerator(userId: string): boolean;
  canUserPost(userId: string): boolean;
  getParticipant(userId: string): IChatParticipant | undefined;
}

interface IChatMessageDoc extends IChatMessage, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  canUserEdit(userId: string): boolean;
  canUserDelete(userId: string, userRole?: string): boolean;
  addReaction(emoji: string, userId: string): Promise<IChatMessageDoc>;
}

interface IChatUnreadCountDoc extends IChatUnreadCount, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IChatTypingIndicatorDoc extends IChatTypingIndicator, Document {
  _id: Types.ObjectId;
}

interface IChatDraftDoc extends IChatDraft, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IChatCallDoc extends IChatCall, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IChatThreadDoc extends IChatThread, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IChatFolderDoc extends IChatFolder, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Attachment Schema
const AttachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  name: { type: String, required: true },
  public_id: { type: String, required: true },
  secure_url: { type: String, required: true },
  original_filename: { type: String, required: true },
  format: { type: String, required: true },
  bytes: { type: Number, required: true },
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    required: true
  },
  resource_type: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  duration: { type: Number }, // For audio/video
  thumbnailUrl: { type: String } // Cloudinary video thumbnails
}, { _id: false });

// Message Metadata Schema
const MessageMetadataSchema = new Schema<IMessageMetadata>({
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    name: { type: String }
  },
  contact: {
    name: { type: String },
    phoneNumbers: [String],
    emails: [String]
  },
  poll: {
    question: { type: String },
    options: [String],
    allowMultiple: { type: Boolean, default: false },
    votes: {
      type: Map,
      of: [String], // userIds as strings
      default: new Map()
    }
  },
  systemAction: {
    type: {
      type: String,
      enum: ['user_joined', 'user_left', 'user_added', 'user_removed', 'chat_created', 'name_changed', 'avatar_changed']
    },
    actorId: { type: String },
    targetIds: [String],
    data: { type: Schema.Types.Mixed } as { type: typeof Schema.Types.Mixed }
  },
  forwarded: {
    originalMessageId: { type: String },
    originalChatId: { type: String },
    originalSenderId: { type: String },
    forwardedAt: { type: Date }
  }
}, { _id: false });

// Enhanced Participant Schema
const ParticipantSchema = new Schema<IChatParticipant>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['member', 'admin', 'owner', 'moderator'] as ParticipantRole[],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastRead: { type: Date },
  lastSeen: { type: Date },
  mutedUntil: { type: Date },
  pinnedMessages: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }], // Regular array
  customNotificationSettings: {
    muted: { type: Boolean, default: false },
    mentions: { type: Boolean, default: true },
    replies: { type: Boolean, default: true }
  },
  isArchived: { type: Boolean, default: false },
  addedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

// Enhanced Chat Schema
const ChatSchema = new Schema<IChatDoc>({
  name: {
    type: String,
    trim: true,
    required: function(this: IChatDoc) {
      return this.type !== 'direct';
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'channel', 'announcement'] as ChatType[],
    required: true
  },
  participants: {
    type: [ParticipantSchema], // Regular array instead of DocumentArray
    required: true,
    validate: {
      validator: function(this: IChatDoc, participants: IChatParticipant[]) {
        if (this.type === 'direct' && participants.length !== 2) {
          return false;
        }
        return participants.length > 0;
      },
      message: 'Invalid number of participants for chat type'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{ // Regular array instead of Types.Array
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{ // Regular array instead of Types.Array
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Chat appearance
  avatar: { type: String, trim: true },
  theme: { type: String, default: 'default' },
  wallpaper: { type: String },
  
  // Chat settings
  isArchived: { type: Boolean, default: false },
  settings: {
    allowMemberInvites: { type: Boolean, default: true },
    allowMemberExit: { type: Boolean, default: true },
    onlyAdminsCanPost: { type: Boolean, default: false },
    messageRetention: { type: Number }, // Days
    allowFileSharing: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 50 * 1024 * 1024 }, // 50MB
    allowedFileTypes: {
      type: [String],
      default: ['image', 'video', 'audio', 'document']
    },
    readReceipts: { type: Boolean, default: true },
    typingIndicators: { type: Boolean, default: true }
  },
  
  // Chat metadata
  lastMessage: {
    messageId: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    content: { type: String },
    sentAt: { type: Date },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'video', 'audio', 'system', 'location', 'contact', 'poll', 'reply', 'forward'] as MessageType[]
    }
  },
  pinnedMessages: [{ // Regular array instead of Types.Array
    type: Schema.Types.ObjectId,
    ref: 'ChatMessage'
  }],
  
  // Chat statistics
  messageCount: { type: Number, default: 0 },
  activeParticipants: { type: Number, default: 0 },
  
  // For public channels
  isPublic: { type: Boolean, default: false },
  inviteLink: { type: String, unique: true, sparse: true },
  inviteLinkExpiry: { type: Date },
  tags: [String]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>): TransformReturnType => {
      const transformed = ret as TransformReturnType;
      transformed.id = (ret._id as Types.ObjectId).toString();
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    }
  }
});

// Enhanced Message Schema
const ChatMessageSchema = new Schema<IChatMessageDoc>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function(this: IChatMessageDoc) {
      return this.type === 'text' && !this.metadata;
    },
    trim: true,
    maxlength: 4000 // Like WhatsApp
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video', 'audio', 'system', 'location', 'contact', 'poll', 'reply', 'forward'] as MessageType[],
    required: true,
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'] as MessageStatus[],
    default: 'sending'
  },
  
  // Enhanced message features
  attachments: [AttachmentSchema],
  metadata: MessageMetadataSchema,
  
  // Message interactions
  reactions: {
    type: Map,
    of: [Schema.Types.ObjectId],
    default: new Map()
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  mentionedUsers: [{ // Regular array instead of Types.Array
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Message state
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Regular array
  
  // Message visibility and delivery
  readBy: {
    type: Map,
    of: Date,
    default: new Map()
  },
  deliveredTo: [{ // Regular array instead of Types.Array
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Thread support
  threadReplies: { type: Number, default: 0 },
  lastThreadReplyAt: { type: Date },
  
  // Message priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>): TransformReturnType => {
      const transformed = ret as TransformReturnType;
      transformed.id = (ret._id as Types.ObjectId).toString();
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    }
  }
});

// Supporting schemas
const ChatUnreadCountSchema = new Schema<IChatUnreadCountDoc>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  lastMessageAt: { type: Date },
  mentionCount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: Document, ret: Record<string, unknown>): TransformReturnType => {
      const transformed = ret as TransformReturnType;
      transformed.id = (ret._id as Types.ObjectId).toString();
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    }
  }
});

const ChatTypingIndicatorSchema = new Schema<IChatTypingIndicatorDoc>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isTyping: {
    type: Boolean,
    required: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

const ChatDraftSchema = new Schema<IChatDraftDoc>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: { type: String, required: true },
  attachments: [AttachmentSchema],
  replyTo: { type: Schema.Types.ObjectId, ref: 'ChatMessage' }
}, {
  timestamps: true
});

const ChatCallSchema = new Schema<IChatCallDoc>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{ // Regular array
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  type: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'ongoing', 'ended', 'missed', 'declined'],
    default: 'initiated'
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number } // seconds
}, {
  timestamps: true
});

const ChatThreadSchema = new Schema<IChatThreadDoc>({
  originalMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true,
    unique: true
  },
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  participants: [{ // Regular array
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastReplyAt: { type: Date, required: true },
  replyCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

const ChatFolderSchema = new Schema<IChatFolderDoc>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true, trim: true },
  chatIds: [{ // Regular array
    type: Schema.Types.ObjectId,
    ref: 'Chat'
  }],
  color: { type: String, default: '#007bff' },
  icon: { type: String }
}, {
  timestamps: true
});

// Indexes for better performance
ChatSchema.index({ type: 1 });
ChatSchema.index({ 'participants.userId': 1 });
ChatSchema.index({ createdAt: -1 });
ChatSchema.index({ updatedAt: -1 });
ChatSchema.index({ isPublic: 1, type: 1 });
ChatSchema.index({ tags: 1 });
ChatSchema.index({ inviteLink: 1 }, { sparse: true });

ChatMessageSchema.index({ chatId: 1, createdAt: -1 });
ChatMessageSchema.index({ senderId: 1 });
ChatMessageSchema.index({ type: 1 });
ChatMessageSchema.index({ 'metadata.systemAction.type': 1 });
ChatMessageSchema.index({ mentionedUsers: 1 });
ChatMessageSchema.index({ replyTo: 1 });
ChatMessageSchema.index({ deleted: 1 });

ChatUnreadCountSchema.index({ userId: 1, chatId: 1 }, { unique: true });
ChatUnreadCountSchema.index({ userId: 1 });

ChatTypingIndicatorSchema.index({ chatId: 1, userId: 1 }, { unique: true });
ChatTypingIndicatorSchema.index({ lastActive: 1 }, { expireAfterSeconds: 30 });

ChatDraftSchema.index({ userId: 1, chatId: 1 }, { unique: true });

ChatCallSchema.index({ chatId: 1, createdAt: -1 });
ChatCallSchema.index({ participants: 1, status: 1 });

ChatThreadSchema.index({ originalMessageId: 1 }, { unique: true });
ChatThreadSchema.index({ chatId: 1, lastReplyAt: -1 });

ChatFolderSchema.index({ userId: 1 });

// Virtual fields
ChatSchema.virtual('messages', {
  ref: 'ChatMessage',
  localField: '_id',
  foreignField: 'chatId'
});

// Middleware
ChatMessageSchema.pre('save', async function(next) {
  // Auto-update chat's lastMessage and messageCount
  if (this.isNew && !this.deleted) {
    await this.model('Chat').findByIdAndUpdate(
      this.chatId,
      {
        $set: {
          'lastMessage.messageId': this._id,
          'lastMessage.content': this.content,
          'lastMessage.sentAt': this.createdAt || new Date(),
          'lastMessage.senderId': this.senderId,
          'lastMessage.type': this.type
        },
        $inc: { messageCount: 1 }
      }
    );
  }
  next();
});

// Static methods interfaces
interface IChatModel extends Model<IChatDoc> {
  findOrCreateDirectChat(user1: string, user2: string): Promise<IChatDoc>;
  getUserChats(userId: string): Promise<IChatDoc[]>;
  addParticipants(chatId: string, userIds: string[], addedBy: string): Promise<IChatDoc>;
}

interface IChatMessageModel extends Model<IChatMessageDoc> {
  getChatMessages(chatId: string, limit?: number, before?: Date, userId?: string): Promise<IChatMessageDoc[]>;
  markMessagesAsRead(chatId: string, userId: string): Promise<void>;
  getThreadMessages(originalMessageId: string, limit?: number, before?: Date): Promise<IChatMessageDoc[]>;
  searchMessages(chatId: string, searchTerm: string, limit?: number): Promise<IChatMessageDoc[]>;
}

// Static methods for Chat
ChatSchema.statics.findOrCreateDirectChat = async function(user1: string, user2: string): Promise<IChatDoc> {
  const existingChat = await this.findOne({
    type: 'direct',
    'participants.userId': { 
      $all: [new Types.ObjectId(user1), new Types.ObjectId(user2)] 
    }
  }).populate('participants.userId', 'name email profileImage image');
  
  if (existingChat) return existingChat;
  
  const chat = new this({
    type: 'direct',
    participants: [
      { userId: new Types.ObjectId(user1), role: 'member' },
      { userId: new Types.ObjectId(user2), role: 'member' }
    ],
    createdBy: new Types.ObjectId(user1),
    activeParticipants: 2,
    admins: [] // Initialize as empty array
  });
  
  return chat.save();
};

ChatSchema.statics.getUserChats = async function(userId: string): Promise<IChatDoc[]> {
  return this.find({
    'participants.userId': new Types.ObjectId(userId),
    'participants.isArchived': { $ne: true }
  })
  .sort({ 'lastMessage.sentAt': -1 })
  .populate('participants.userId', 'name email profileImage image')
  .populate('lastMessage.senderId', 'name profileImage image');
};

ChatSchema.statics.addParticipants = async function(chatId: string, userIds: string[], addedBy: string): Promise<IChatDoc> {
  const chat = await this.findById(chatId);
  if (!chat) throw new Error('Chat not found');
  
  if (chat.type === 'direct') throw new Error('Cannot add participants to direct chat');
  
  // Check if user has permission to add participants
  const isAdmin = chat.admins?.some((adminId: Types.ObjectId) => adminId.equals(new Types.ObjectId(addedBy))) || 
                 chat.createdBy.equals(new Types.ObjectId(addedBy));
  if (!isAdmin) throw new Error('Only admins can add participants');
  
  // Add new participants
  const newParticipants = userIds.map(userId => ({
    userId: new Types.ObjectId(userId),
    role: 'member' as ParticipantRole,
    joinedAt: new Date(),
    addedBy: new Types.ObjectId(addedBy)
  }));
  
  chat.participants.push(...newParticipants);
  chat.activeParticipants += userIds.length;
  return chat.save();
};

// Static methods for Messages
ChatMessageSchema.statics.getChatMessages = async function(
  chatId: string, 
  limit: number = 50, 
  before?: Date,
  userId?: string
): Promise<IChatMessageDoc[]> {
  const query: Record<string, unknown> = { 
    chatId: new Types.ObjectId(chatId),
    deleted: false
  };
  
  // Don't show messages deleted for this user
  if (userId) {
    query.deletedFor = { $ne: new Types.ObjectId(userId) };
  }
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'name profileImage image')
    .populate('replyTo')
    .populate('mentionedUsers', 'name');
};

ChatMessageSchema.statics.markMessagesAsRead = async function(chatId: string, userId: string): Promise<void> {
  // Update unread count
  await ChatUnreadCount.updateOne(
    { chatId: new Types.ObjectId(chatId), userId: new Types.ObjectId(userId) },
    { $set: { count: 0, mentionCount: 0, lastMessageAt: new Date() } },
    { upsert: true }
  );
  
  // Update last read timestamp in participant
  await Chat.updateOne(
    { _id: new Types.ObjectId(chatId), 'participants.userId': new Types.ObjectId(userId) },
    { $set: { 'participants.$.lastRead': new Date() } }
  );
};

// Additional static methods for enhanced functionality
ChatMessageSchema.statics.getThreadMessages = async function(
  originalMessageId: string,
  limit: number = 20,
  before?: Date
): Promise<IChatMessageDoc[]> {
  const query: Record<string, unknown> = {
    replyTo: new Types.ObjectId(originalMessageId),
    deleted: false
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ createdAt: 1 }) // Ascending order for thread replies
    .limit(limit)
    .populate('senderId', 'name profileImage image')
    .populate('mentionedUsers', 'name');
};

ChatMessageSchema.statics.searchMessages = async function(
  chatId: string,
  searchTerm: string,
  limit: number = 20
): Promise<IChatMessageDoc[]> {
  return this.find({
    chatId: new Types.ObjectId(chatId),
    deleted: false,
    $text: { $search: searchTerm }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .populate('senderId', 'name profileImage image');
};

// Add text search index for message content
ChatMessageSchema.index({ content: 'text' });

// Pre-save middleware for additional message processing
ChatMessageSchema.pre('save', function(next) {
  // Auto-extract mentions from content
  if (this.type === 'text' && this.content) {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(this.content)) !== null) {
      mentions.push(match[1]); // Extract username without @
    }
    
    if (mentions.length > 0) {
      // Note: You would need to resolve usernames to ObjectIds here
      // This is just a placeholder for the logic - implement based on your needs
      this.mentionedUsers = mentions.map(() => {
        return new Types.ObjectId(); // Placeholder
      }).filter(Boolean);
    }
  }
  
  // Set status to 'sent' if it was 'sending' and we're saving
  if (this.status === 'sending' && this.isNew) {
    this.status = 'sent';
  }
  
  next();
});

// Instance methods for Chat
ChatSchema.methods.isUserAdmin = function(this: IChatDoc, userId: string): boolean {
  return this.createdBy.equals(new Types.ObjectId(userId)) ||
         this.admins.some(adminId => adminId.equals(new Types.ObjectId(userId)));
};

ChatSchema.methods.isUserModerator = function(this: IChatDoc, userId: string): boolean {
  return this.isUserAdmin(userId) || 
         Boolean(this.moderators && this.moderators.some(modId => modId.equals(new Types.ObjectId(userId))));
};

ChatSchema.methods.canUserPost = function(this: IChatDoc, userId: string): boolean {
  if (this.settings.onlyAdminsCanPost) {
    return this.isUserAdmin(userId);
  }
  
  // Check if user is a participant
  return this.participants.some(participant => 
    participant.userId.equals(new Types.ObjectId(userId))
  );
};

ChatSchema.methods.getParticipant = function(this: IChatDoc, userId: string) {
  return this.participants.find(participant => 
    participant.userId.equals(new Types.ObjectId(userId))
  );
};

// Instance methods for Messages
ChatMessageSchema.methods.canUserEdit = function(this: IChatMessageDoc, userId: string): boolean {
  // Only sender can edit within 15 minutes
  if (!this.senderId.equals(new Types.ObjectId(userId))) {
    return false;
  }
  
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return !!(this.createdAt && this.createdAt > fifteenMinutesAgo && !this.deleted);
};

ChatMessageSchema.methods.canUserDelete = function(this: IChatMessageDoc, userId: string, userRole?: string): boolean {
  // Sender can always delete their own messages
  if (this.senderId.equals(new Types.ObjectId(userId))) {
    return true;
  }
  
  // Admins can delete any message
  return !!(userRole && (userRole === 'admin' || userRole === 'owner'));
};

ChatMessageSchema.methods.addReaction = function(this: IChatMessageDoc, emoji: string, userId: string) {
  if (!this.reactions.has(emoji)) {
    this.reactions.set(emoji, []);
  }
  
  const reactions = this.reactions.get(emoji) || [];
  const userObjectId = new Types.ObjectId(userId);
  
  // Toggle reaction - remove if exists, add if doesn't
  const existingIndex = reactions.findIndex(id => id.equals(userObjectId));
  if (existingIndex > -1) {
    reactions.splice(existingIndex, 1);
  } else {
    reactions.push(userObjectId);
  }
  
  this.reactions.set(emoji, reactions);
  return this.save();
};

// Export models with proper typing
const Chat = mongoose.model<IChatDoc, IChatModel>('Chat', ChatSchema);
const ChatMessage = mongoose.model<IChatMessageDoc, IChatMessageModel>('ChatMessage', ChatMessageSchema);
const ChatUnreadCount = mongoose.model<IChatUnreadCountDoc>('ChatUnreadCount', ChatUnreadCountSchema);
const ChatTypingIndicator = mongoose.model<IChatTypingIndicatorDoc>('ChatTypingIndicator', ChatTypingIndicatorSchema);
const ChatDraft = mongoose.model<IChatDraftDoc>('ChatDraft', ChatDraftSchema);
const ChatCall = mongoose.model<IChatCallDoc>('ChatCall', ChatCallSchema);
const ChatThread = mongoose.model<IChatThreadDoc>('ChatThread', ChatThreadSchema);
const ChatFolder = mongoose.model<IChatFolderDoc>('ChatFolder', ChatFolderSchema);

export {
  Chat,
  ChatMessage,
  ChatUnreadCount,
  ChatTypingIndicator,
  ChatDraft,
  ChatCall,
  ChatThread,
  ChatFolder
};