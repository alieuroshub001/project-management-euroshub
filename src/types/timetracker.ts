// types/timetracker.ts - Enhanced types for Upwork-like time tracker

// Basic status and category enums
export type TimeTrackerStatus = 'running' | 'paused' | 'stopped' | 'archived';

export type TaskCategory = 'development' | 'design' | 'testing' | 'meeting' | 'documentation' | 'research' | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Activity Level Interface - 10-minute intervals like Upwork
export interface IActivityLevel {
  timestamp: Date;
  keystrokes: number;
  mouseClicks: number;
  mouseMoves: number;
  scrolls: number;
  activeWindowTitle?: string;
  activeApplicationName?: string;
  productivityScore: number; // 0-100
  isIdle: boolean;
  intervalMinutes: number; // Usually 10 minutes
}

// Enhanced Screenshot Interface
export interface IScreenshot {
  url: string;
  thumbnailUrl: string;
  blurredUrl?: string; // For privacy mode
  public_id: string;
  timestamp: Date;
  intervalStart: Date; // When the 10-minute interval started
  intervalEnd: Date; // When the 10-minute interval ended
  activityLevel: number; // Activity score for this interval (0-100)
  keystrokes: number; // Keystrokes in this interval
  mouseClicks: number; // Mouse clicks in this interval
  activeWindowTitle?: string;
  activeApplicationName?: string;
  description?: string; // User can add description
  isManualCapture: boolean; // True if manually captured
  isBlurred: boolean; // True if screenshot is blurred
  isDeleted: boolean;
  deletedAt?: Date;
  width?: number;
  height?: number;
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Task Interface
export interface ITaskCompleted {
  task: string;
  description?: string;
  hoursSpent?: number;
  category: TaskCategory;
  priority: TaskPriority;
  projectId?: string;
  tags: string[];
}

// Device Info Interface
export interface IDeviceInfo {
  os?: string;
  browser?: string;
  screen?: {
    width: number;
    height: number;
  };
  userAgent?: string;
}

// Working Hours Interface
export interface IWorkingHours {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

// Notification Settings Interface
export interface INotificationSettings {
  sessionStart: boolean;
  sessionEnd: boolean;
  screenshotTaken: boolean;
  idleDetection: boolean;
  lowActivity: boolean;
}

// Time Tracker Session Interface - Main tracking session
export interface ITimeTrackerSession {
  id?: string;
  employeeId: string;
  projectId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  pausedTime: number; // Total paused time in minutes
  status: TimeTrackerStatus;
  screenshots: IScreenshot[];
  activityLevels: IActivityLevel[];
  tasksCompleted: ITaskCompleted[];
  totalHours?: number;
  productiveHours: number;
  idleHours: number;
  averageActivityLevel: number;
  totalKeystrokes: number;
  totalMouseClicks: number;
  notes?: string;
  lastActive: Date;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  hourlyRate?: number;
  totalEarnings?: number;
  timezone: string;
  deviceInfo?: IDeviceInfo;
  createdAt: Date;
  updatedAt: Date;
}

// Time Tracker Settings Interface
export interface ITimeTrackerSettings {
  id?: string;
  employeeId: string;
  screenshotFrequency: number; // in minutes
  randomScreenshots: boolean;
  screenshotsPerHour: number;
  trackingEnabled: boolean;
  blurScreenshots: boolean;
  screenshotsRequired: boolean;
  activityTrackingEnabled: boolean;
  keyloggerEnabled: boolean;
  idleTimeThreshold: number; // in minutes
  autoBreakReminder: boolean;
  breakReminderInterval: number; // in minutes
  cloudinaryFolder: string;
  workingHours: IWorkingHours;
  workingDays: string[];
  notifications: INotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Work Diary Interface - Daily summary
export interface IWorkDiary {
  id?: string;
  employeeId: string;
  sessionId: string;
  date: Date;
  totalHours: number;
  productiveHours: number;
  screenshotCount: number;
  averageActivityLevel: number;
  tasksCompleted: number;
  earnings: number;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ITimeTrackerStats {
  daily: {
    totalHours: number;
    productiveHours: number;
    totalSessions: number;
    totalScreenshots: number;
    averageActivity: number;
  };
  weekly: Array<{
    day: number;
    totalHours: number;
    productiveHours: number;
    totalSessions: number;
    averageActivity: number;
  }>;
  monthly: Array<{
    date: number;
    totalHours: number;
    productiveHours: number;
    totalSessions: number;
    totalEarnings: number;
    averageActivity: number;
  }>;
}

// Screenshot Upload Interface
export interface IScreenshotUpload {
  file: File;
  timestamp: Date;
  intervalStart: Date;
  intervalEnd: Date;
  activityLevel: number;
  keystrokes: number;
  mouseClicks: number;
  activeWindowTitle?: string;
  activeApplicationName?: string;
  isManualCapture?: boolean;
}

// Activity Tracking Interface
export interface IActivityData {
  timestamp: Date;
  keystrokes: number;
  mouseClicks: number;
  mouseMoves: number;
  scrolls: number;
  activeWindowTitle?: string;
  activeApplicationName?: string;
  isIdle: boolean;
}

// Session Summary Interface
export interface ISessionSummary {
  sessionId: string;
  title: string;
  duration: string; // "2h 30m"
  productiveTime: string;
  idleTime: string;
  screenshotCount: number;
  activityLevel: number;
  tasksCount: number;
  earnings: number;
  status: TimeTrackerStatus;
  date: Date;
}

// Time Entry Interface (for manual time entries)
export interface ITimeEntry {
  id?: string;
  employeeId: string;
  projectId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in hours
  isManual: boolean;
  tasksCompleted: ITaskCompleted[];
  hourlyRate?: number;
  totalEarnings?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Screenshot Grid Interface (for displaying screenshots)
export interface IScreenshotGrid {
  screenshots: IScreenshot[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Activity Report Interface
export interface IActivityReport {
  employeeId: string;
  date: Date;
  intervals: Array<{
    startTime: Date;
    endTime: Date;
    screenshot?: IScreenshot;
    activityLevel: number;
    keystrokes: number;
    mouseClicks: number;
    activeApplication?: string;
    isIdle: boolean;
  }>;
  summary: {
    totalHours: number;
    productiveHours: number;
    idleHours: number;
    averageActivity: number;
    totalScreenshots: number;
  };
}

// Client-side interfaces for components
export interface ITimeTrackerContextValue {
  currentSession: ITimeTrackerSession | null;
  isTracking: boolean;
  isPaused: boolean;
  elapsedTime: number;
  settings: ITimeTrackerSettings | null;
  startTracking: (title: string, projectId?: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  pauseTracking: () => Promise<void>;
  resumeTracking: () => Promise<void>;
  captureScreenshot: () => Promise<void>;
  updateActivity: (activity: IActivityData) => void;
  addTask: (task: Omit<ITaskCompleted, 'id'>) => Promise<void>;
  updateNotes: (notes: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

// Screenshot viewer interface
export interface IScreenshotViewerProps {
  screenshots: IScreenshot[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDelete?: (screenshot: IScreenshot) => void;
  onAddDescription?: (screenshot: IScreenshot, description: string) => void;
}

// Time tracker dashboard interface
export interface ITimeTrackerDashboardData {
  activeSessions: ITimeTrackerSession[];
  recentSessions: ITimeTrackerSession[];
  stats: ITimeTrackerStats;
  workDiary: IWorkDiary[];
  settings: ITimeTrackerSettings;
  totalEarnings: number;
  weeklyHours: number;
  monthlyHours: number;
}

// Filter and sorting options
export interface ISessionFilters {
  status?: TimeTrackerStatus[];
  projectId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minHours?: number;
  maxHours?: Date;
  approved?: boolean;
}

export interface ISessionSortOptions {
  field: 'startTime' | 'totalHours' | 'productiveHours' | 'averageActivityLevel' | 'totalEarnings';
  direction: 'asc' | 'desc';
}

// Webhook payload types for different events
export interface ISessionStartedPayload {
  sessionId: string;
  title: string;
  projectId?: string;
  startTime: Date;
}

export interface ISessionStoppedPayload {
  sessionId: string;
  endTime: Date;
  totalHours: number;
  productiveHours: number;
}

export interface ISessionPausedPayload {
  sessionId: string;
  pausedAt: Date;
  totalElapsedMinutes: number;
}

export interface IScreenshotCapturedPayload {
  sessionId: string;
  screenshotId: string;
  timestamp: Date;
  activityLevel: number;
}

export interface IActivityUpdatedPayload {
  sessionId: string;
  activityData: IActivityLevel;
  timestamp: Date;
}

// Union type for all webhook payloads
export type WebhookPayload = 
  | ISessionStartedPayload 
  | ISessionStoppedPayload 
  | ISessionPausedPayload 
  | IScreenshotCapturedPayload 
  | IActivityUpdatedPayload;

// Webhook/Real-time interfaces
export interface ITimeTrackerWebhook {
  event: 'session_started' | 'session_stopped' | 'session_paused' | 'screenshot_captured' | 'activity_updated';
  data: {
    employeeId: string;
    sessionId: string;
    timestamp: Date;
    payload: WebhookPayload;
  };
}

// Generic API response data types
export type ApiResponseData = 
  | ITimeTrackerSession
  | ITimeTrackerSession[]
  | ITimeTrackerSettings
  | IWorkDiary
  | IWorkDiary[]
  | ITimeTrackerStats
  | IScreenshot
  | IScreenshot[]
  | ISessionSummary
  | ISessionSummary[]
  | IActivityReport
  | ITimeTrackerDashboardData
  | Record<string, unknown>
  | null;

// Utility types for API responses
export interface ITimeTrackerApiResponse<T = ApiResponseData> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}