// models/TimeTracker.ts - Enhanced Upwork-like time tracker (Fixed Type Issues)
import mongoose, { Schema, Model, Document, Types, CallbackError } from 'mongoose';
import { 
  IScreenshot, 
  ITimeTrackerSession, 
  ITimeTrackerSettings,
  IWorkDiary,
  IActivityLevel,
  ITaskCompleted
} from '@/types';

// Document interfaces - Fixed inheritance issues
interface IScreenshotDocument extends Omit<IScreenshot, 'id'>, Document {
  _id: Types.ObjectId;
}

interface ITimeTrackerSessionDocument extends Omit<ITimeTrackerSession, 'employeeId' | 'projectId' | 'id'>, Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  projectId?: Types.ObjectId;
  durationMinutes: number;
  durationHours: number;
  productiveMinutes: number;
  idleMinutes: number;
}

interface ITimeTrackerSettingsDocument extends Omit<ITimeTrackerSettings, 'employeeId' | 'id'>, Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
}

interface IWorkDiaryDocument extends Omit<IWorkDiary, 'employeeId' | 'sessionId' | 'id'>, Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  sessionId: Types.ObjectId;
}

// Type for JSON transformation
interface TransformedDocument {
  id: string;
  [key: string]: unknown;
}

// Activity Level Schema - tracks productivity metrics per 10-minute interval
const ActivityLevelSchema = new Schema<IActivityLevel>({
  timestamp: { 
    type: Date, 
    required: [true, 'Activity timestamp is required'],
    index: true
  },
  keystrokes: { 
    type: Number, 
    default: 0,
    min: [0, 'Keystrokes cannot be negative']
  },
  mouseClicks: { 
    type: Number, 
    default: 0,
    min: [0, 'Mouse clicks cannot be negative']
  },
  mouseMoves: { 
    type: Number, 
    default: 0,
    min: [0, 'Mouse moves cannot be negative']
  },
  scrolls: { 
    type: Number, 
    default: 0,
    min: [0, 'Scrolls cannot be negative']
  },
  activeWindowTitle: { 
    type: String,
    maxlength: [200, 'Window title cannot exceed 200 characters'],
    trim: true
  },
  activeApplicationName: { 
    type: String,
    maxlength: [100, 'Application name cannot exceed 100 characters'],
    trim: true
  },
  productivityScore: { 
    type: Number, 
    min: [0, 'Productivity score cannot be negative'],
    max: [100, 'Productivity score cannot exceed 100'],
    default: 0
  },
  isIdle: { 
    type: Boolean, 
    default: false 
  },
  intervalMinutes: { 
    type: Number, 
    default: 10,
    min: [1, 'Interval must be at least 1 minute']
  }
}, { _id: false });

// Screenshot Schema - Enhanced for Upwork-like functionality
const ScreenshotSchema = new Schema<IScreenshotDocument>({
  url: { 
    type: String, 
    required: [true, 'Screenshot URL is required'] 
  },
  thumbnailUrl: { 
    type: String, 
    required: [true, 'Thumbnail URL is required'] 
  },
  blurredUrl: { 
    type: String,
    required: false // Only if blurring is enabled
  },
  public_id: { 
    type: String, 
    required: [true, 'Cloudinary public ID is required'],
    unique: true
  },
  timestamp: { 
    type: Date, 
    required: [true, 'Screenshot timestamp is required'],
    default: Date.now,
    index: true
  },
  intervalStart: { 
    type: Date, 
    required: [true, 'Interval start time is required']
  },
  intervalEnd: { 
    type: Date, 
    required: [true, 'Interval end time is required']
  },
  activityLevel: {
    type: Number,
    min: [0, 'Activity level cannot be negative'],
    max: [100, 'Activity level cannot exceed 100'],
    default: 0
  },
  keystrokes: { 
    type: Number, 
    default: 0,
    min: [0, 'Keystrokes cannot be negative']
  },
  mouseClicks: { 
    type: Number, 
    default: 0,
    min: [0, 'Mouse clicks cannot be negative']
  },
  activeWindowTitle: { 
    type: String,
    maxlength: [200, 'Window title cannot exceed 200 characters'],
    trim: true
  },
  activeApplicationName: { 
    type: String,
    maxlength: [100, 'Application name cannot exceed 100 characters'],
    trim: true
  },
  description: { 
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  isManualCapture: { 
    type: Boolean, 
    default: false 
  },
  isBlurred: { 
    type: Boolean, 
    default: false 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedAt: { 
    type: Date 
  },
  width: { 
    type: Number,
    min: [1, 'Width must be positive']
  },
  height: { 
    type: Number,
    min: [1, 'Height must be positive']
  },
  fileSize: { 
    type: Number,
    min: [1, 'File size must be positive']
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc: Document, ret: Record<string, unknown>): TransformedDocument {
      const transformed = ret as TransformedDocument;
      transformed.id = (ret._id as Types.ObjectId)?.toString() || '';
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    }
  }
});

// Task Schema
const TaskSchema = new Schema<ITaskCompleted>({
  task: { 
    type: String, 
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: [200, 'Task description cannot exceed 200 characters']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Task details cannot exceed 1000 characters']
  },
  hoursSpent: { 
    type: Number, 
    min: [0, 'Hours spent cannot be negative'],
    max: [24, 'Hours spent cannot exceed 24']
  },
  category: {
    type: String,
    enum: ['development', 'design', 'testing', 'meeting', 'documentation', 'research', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project' 
  },
  tags: [{ 
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }]
}, { _id: false });

// Time Tracker Session Schema - Main tracking session
const TimeTrackerSessionSchema = new Schema<ITimeTrackerSessionDocument, TimeTrackerSessionModel>({
  employeeId: { 
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: [true, 'Employee ID is required'],
    index: true
  },
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [100, 'Session title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Session description cannot exceed 500 characters']
  },
  startTime: { 
    type: Date, 
    required: [true, 'Start time is required'],
    default: Date.now,
    index: true
  },
  endTime: { 
    type: Date,
    validate: {
      validator: function(this: ITimeTrackerSessionDocument, value: Date) {
        return !value || value >= this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  pausedTime: {
    type: Number,
    default: 0,
    min: [0, 'Paused time cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['running', 'paused', 'stopped', 'archived'] as const,
      message: 'Status must be one of: running, paused, stopped, archived'
    },
    default: 'running',
    required: [true, 'Status is required'],
    index: true
  },
  screenshots: {
    type: [ScreenshotSchema],
    validate: {
      validator: function(screenshots: IScreenshot[]) {
        return screenshots.length <= 2000; // Reasonable limit
      },
      message: 'Maximum of 2000 screenshots allowed per session'
    }
  },
  activityLevels: [ActivityLevelSchema],
  tasksCompleted: [TaskSchema],
  totalHours: { 
    type: Number,
    min: [0, 'Total hours cannot be negative'],
    max: [24*7, 'Total hours cannot exceed 168 (7 days)']
  },
  productiveHours: { 
    type: Number,
    min: [0, 'Productive hours cannot be negative'],
    default: 0
  },
  idleHours: { 
    type: Number,
    min: [0, 'Idle hours cannot be negative'],
    default: 0
  },
  averageActivityLevel: {
    type: Number,
    min: [0, 'Average activity level cannot be negative'],
    max: [100, 'Average activity level cannot exceed 100'],
    default: 0
  },
  totalKeystrokes: { 
    type: Number, 
    default: 0,
    min: [0, 'Total keystrokes cannot be negative']
  },
  totalMouseClicks: { 
    type: Number, 
    default: 0,
    min: [0, 'Total mouse clicks cannot be negative']
  },
  notes: { 
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    trim: true
  },
  lastActive: { 
    type: Date,
    default: Date.now,
    index: true
  },
  isApproved: { 
    type: Boolean, 
    default: false 
  },
  approvedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvedAt: { 
    type: Date 
  },
  rejectedReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative']
  },
  totalEarnings: {
    type: Number,
    min: [0, 'Total earnings cannot be negative']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  deviceInfo: {
    os: { type: String, maxlength: [50, 'OS name cannot exceed 50 characters'] },
    browser: { type: String, maxlength: [50, 'Browser name cannot exceed 50 characters'] },
    screen: {
      width: { type: Number, min: [1, 'Screen width must be positive'] },
      height: { type: Number, min: [1, 'Screen height must be positive'] }
    },
    userAgent: { type: String, maxlength: [500, 'User agent cannot exceed 500 characters'] }
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc: Document, ret: Record<string, unknown>): TransformedDocument {
      const transformed = ret as TransformedDocument;
      transformed.id = (ret._id as Types.ObjectId)?.toString() || '';
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc: Document, ret: Record<string, unknown>): TransformedDocument {
      const transformed = ret as TransformedDocument;
      transformed.id = (ret._id as Types.ObjectId)?.toString() || '';
      delete transformed._id;
      delete transformed.__v;
      return transformed;
    }
  }
});

// Time Tracker Settings Schema
const TimeTrackerSettingsSchema = new Schema<ITimeTrackerSettingsDocument>({
  employeeId: { 
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: [true, 'Employee ID is required'],
    unique: true,
    index: true
  },
  screenshotFrequency: { 
    type: Number, 
    min: [1, 'Minimum screenshot frequency is 1 minute'],
    max: [60, 'Maximum screenshot frequency is 60 minutes'],
    default: 10 
  },
  randomScreenshots: {
    type: Boolean,
    default: true
  },
  screenshotsPerHour: { 
    type: Number, 
    min: [1, 'Minimum 1 screenshot per hour'],
    max: [30, 'Maximum 30 screenshots per hour'],
    default: 6 
  },
  trackingEnabled: { 
    type: Boolean, 
    default: true 
  },
  blurScreenshots: { 
    type: Boolean, 
    default: false 
  },
  screenshotsRequired: { 
    type: Boolean, 
    default: true 
  },
  activityTrackingEnabled: {
    type: Boolean,
    default: true
  },
  keyloggerEnabled: {
    type: Boolean,
    default: false
  },
  idleTimeThreshold: {
    type: Number,
    min: [1, 'Idle time threshold must be at least 1 minute'],
    max: [60, 'Idle time threshold cannot exceed 60 minutes'],
    default: 5
  },
  autoBreakReminder: {
    type: Boolean,
    default: true
  },
  breakReminderInterval: {
    type: Number,
    min: [15, 'Break reminder interval must be at least 15 minutes'],
    max: [240, 'Break reminder interval cannot exceed 240 minutes'],
    default: 60
  },
  cloudinaryFolder: {
    type: String,
    default: 'time_tracker_screenshots',
    maxlength: [100, 'Cloudinary folder path cannot exceed 100 characters']
  },
  workingHours: {
    start: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'],
      default: '09:00'
    },
    end: {
      type: String,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'],
      default: '17:00'
    }
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  notifications: {
    sessionStart: { type: Boolean, default: true },
    sessionEnd: { type: Boolean, default: true },
    screenshotTaken: { type: Boolean, default: false },
    idleDetection: { type: Boolean, default: true },
    lowActivity: { type: Boolean, default: true }
  }
}, { 
  timestamps: true 
});

// Work Diary Schema - Daily summary
const WorkDiarySchema = new Schema<IWorkDiaryDocument>({
  employeeId: { 
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: [true, 'Employee ID is required'],
    index: true
  },
  sessionId: { 
    type: Schema.Types.ObjectId,
    ref: 'TimeTrackerSession', 
    required: [true, 'Session ID is required']
  },
  date: { 
    type: Date, 
    required: [true, 'Date is required'],
    index: true
  },
  totalHours: { 
    type: Number,
    min: [0, 'Total hours cannot be negative'],
    required: [true, 'Total hours is required']
  },
  productiveHours: { 
    type: Number,
    min: [0, 'Productive hours cannot be negative'],
    default: 0
  },
  screenshotCount: { 
    type: Number,
    min: [0, 'Screenshot count cannot be negative'],
    default: 0
  },
  averageActivityLevel: {
    type: Number,
    min: [0, 'Average activity level cannot be negative'],
    max: [100, 'Average activity level cannot exceed 100'],
    default: 0
  },
  tasksCompleted: { 
    type: Number,
    min: [0, 'Tasks completed cannot be negative'],
    default: 0
  },
  earnings: {
    type: Number,
    min: [0, 'Earnings cannot be negative'],
    default: 0
  },
  summary: {
    type: String,
    maxlength: [1000, 'Summary cannot exceed 1000 characters'],
    trim: true
  }
}, { 
  timestamps: true 
});

// Virtuals
TimeTrackerSessionSchema.virtual('durationMinutes').get(function(this: ITimeTrackerSessionDocument) {
  const end = this.endTime || new Date();
  const totalMinutes = Math.floor((end.getTime() - this.startTime.getTime()) / (1000 * 60));
  return Math.max(0, totalMinutes - (this.pausedTime || 0));
});

TimeTrackerSessionSchema.virtual('durationHours').get(function(this: ITimeTrackerSessionDocument) {
  return parseFloat((this.durationMinutes / 60).toFixed(2));
});

TimeTrackerSessionSchema.virtual('productiveMinutes').get(function(this: ITimeTrackerSessionDocument) {
  if (!this.activityLevels?.length) return 0;
  return this.activityLevels.reduce((total, activity) => {
    return total + (activity.isIdle ? 0 : activity.intervalMinutes);
  }, 0);
});

TimeTrackerSessionSchema.virtual('idleMinutes').get(function(this: ITimeTrackerSessionDocument) {
  return this.durationMinutes - this.productiveMinutes;
});

// Pre-save hooks
TimeTrackerSessionSchema.pre<ITimeTrackerSessionDocument>('save', function(next: (error?: CallbackError) => void) {
  // Calculate totals when session ends
  if (this.endTime) {
    this.totalHours = this.durationHours;
    this.productiveHours = parseFloat((this.productiveMinutes / 60).toFixed(2));
    this.idleHours = parseFloat((this.idleMinutes / 60).toFixed(2));

    // Calculate average activity level
    if (this.activityLevels?.length) {
      const totalScore = this.activityLevels.reduce((sum, activity) => sum + activity.productivityScore, 0);
      this.averageActivityLevel = Math.round(totalScore / this.activityLevels.length);
    }

    // Calculate total keystrokes and mouse clicks
    if (this.activityLevels?.length) {
      this.totalKeystrokes = this.activityLevels.reduce((sum, activity) => sum + activity.keystrokes, 0);
      this.totalMouseClicks = this.activityLevels.reduce((sum, activity) => sum + activity.mouseClicks, 0);
    }

    // Calculate earnings if hourly rate is set
    if (this.hourlyRate) {
      this.totalEarnings = parseFloat((this.totalHours * this.hourlyRate).toFixed(2));
    }
  }

  this.lastActive = new Date();
  next();
});

// Indexes
TimeTrackerSessionSchema.index({ employeeId: 1, status: 1 });
TimeTrackerSessionSchema.index({ employeeId: 1, startTime: -1 });
TimeTrackerSessionSchema.index({ projectId: 1, startTime: -1 });
TimeTrackerSessionSchema.index({ status: 1, startTime: -1 });
TimeTrackerSessionSchema.index({ 'screenshots.timestamp': 1 });
TimeTrackerSessionSchema.index({ 'activityLevels.timestamp': 1 });
TimeTrackerSessionSchema.index({ isApproved: 1, startTime: -1 });

ScreenshotSchema.index({ timestamp: -1 });
ScreenshotSchema.index({ intervalStart: 1, intervalEnd: 1 });
ScreenshotSchema.index({ isDeleted: 1 });

WorkDiarySchema.index({ employeeId: 1, date: -1 });
WorkDiarySchema.index({ date: -1 });

// Daily stats interface
interface DailyStatsResult {
  _id: null;
  totalHours: number;
  productiveHours: number;
  totalSessions: number;
  totalScreenshots: number;
  averageActivity: number;
}

// Weekly stats interface
interface WeeklyStatsResult {
  _id: number;
  totalHours: number;
  productiveHours: number;
  totalSessions: number;
  averageActivity: number;
}

// Monthly stats interface
interface MonthlyStatsResult {
  _id: number;
  totalHours: number;
  productiveHours: number;
  totalSessions: number;
  totalEarnings: number;
  averageActivity: number;
}

// Static methods interface
interface TimeTrackerSessionModel extends Model<ITimeTrackerSessionDocument> {
  getActiveSession(employeeId: Types.ObjectId | string): Promise<ITimeTrackerSessionDocument | null>;
  getEmployeeSessions(employeeId: Types.ObjectId | string, limit?: number): Promise<ITimeTrackerSessionDocument[]>;
  stopAllActiveSessions(employeeId: Types.ObjectId | string): Promise<void>;
  getSessionsByDateRange(employeeId: Types.ObjectId | string, startDate: Date, endDate: Date): Promise<ITimeTrackerSessionDocument[]>;
  getDailyStats(employeeId: Types.ObjectId | string, date: Date): Promise<DailyStatsResult[]>;
  getWeeklyStats(employeeId: Types.ObjectId | string, startDate: Date): Promise<WeeklyStatsResult[]>;
  getMonthlyStats(employeeId: Types.ObjectId | string, month: number, year: number): Promise<MonthlyStatsResult[]>;
}

// Implement static methods
TimeTrackerSessionSchema.statics.getActiveSession = function(employeeId: Types.ObjectId | string) {
  return this.findOne({ 
    employeeId, 
    status: 'running' 
  }).sort({ startTime: -1 });
};

TimeTrackerSessionSchema.statics.getEmployeeSessions = function(
  employeeId: Types.ObjectId | string, 
  limit = 50
) {
  return this.find({ employeeId })
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('projectId', 'name description')
    .exec();
};

TimeTrackerSessionSchema.statics.stopAllActiveSessions = function(employeeId: Types.ObjectId | string) {
  return this.updateMany(
    { employeeId, status: 'running' },
    { $set: { status: 'stopped', endTime: new Date() } }
  ).exec();
};

TimeTrackerSessionSchema.statics.getSessionsByDateRange = function(
  employeeId: Types.ObjectId | string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    employeeId,
    startTime: { $gte: startDate, $lte: endDate }
  })
  .sort({ startTime: -1 })
  .populate('projectId', 'name description')
  .exec();
};

TimeTrackerSessionSchema.statics.getDailyStats = function(
  employeeId: Types.ObjectId | string, 
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        startTime: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$totalHours' },
        productiveHours: { $sum: '$productiveHours' },
        totalSessions: { $sum: 1 },
        totalScreenshots: { $sum: { $size: '$screenshots' } },
        averageActivity: { $avg: '$averageActivityLevel' }
      }
    }
  ]).exec();
};

TimeTrackerSessionSchema.statics.getWeeklyStats = function(
  employeeId: Types.ObjectId | string, 
  startDate: Date
) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        startTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: '$startTime' },
        totalHours: { $sum: '$totalHours' },
        productiveHours: { $sum: '$productiveHours' },
        totalSessions: { $sum: 1 },
        averageActivity: { $avg: '$averageActivityLevel' }
      }
    },
    { $sort: { '_id': 1 } }
  ]).exec();
};

TimeTrackerSessionSchema.statics.getMonthlyStats = function(
  employeeId: Types.ObjectId | string, 
  month: number, 
  year: number
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        startTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: '$startTime' },
        totalHours: { $sum: '$totalHours' },
        productiveHours: { $sum: '$productiveHours' },
        totalSessions: { $sum: 1 },
        totalEarnings: { $sum: '$totalEarnings' },
        averageActivity: { $avg: '$averageActivityLevel' }
      }
    },
    { $sort: { '_id': 1 } }
  ]).exec();
};

// Create models with proper type casting
const TimeTrackerSession = (mongoose.models.TimeTrackerSession || 
  mongoose.model<ITimeTrackerSessionDocument, TimeTrackerSessionModel>(
    'TimeTrackerSession', 
    TimeTrackerSessionSchema
  )) as TimeTrackerSessionModel;

const TimeTrackerSettings = (mongoose.models.TimeTrackerSettings || 
  mongoose.model<ITimeTrackerSettingsDocument>(
    'TimeTrackerSettings', 
    TimeTrackerSettingsSchema
  )) as Model<ITimeTrackerSettingsDocument>;

const WorkDiary = (mongoose.models.WorkDiary || 
  mongoose.model<IWorkDiaryDocument>(
    'WorkDiary', 
    WorkDiarySchema
  )) as Model<IWorkDiaryDocument>;

export { TimeTrackerSession, TimeTrackerSettings, WorkDiary };