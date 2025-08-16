// types/index.ts - Updated with media support
export type UserRole = 'superadmin' | 'admin' | 'hr' | 'employee' | 'client';

// types/index.ts
export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  phone?: string; // Add optional phone field
  profileImage?: string; // Add optional profileImage field
  verificationToken?: string;
    employeeId?: string; // Add employeeId field
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWithPassword extends IUser {
  password: string;
}

// Auth session types
export interface ISessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ISession {
  user: ISessionUser;
  expires: string;
}

// OTP and password reset types
export interface IOTP {
  id: string;
  email: string; // Email where OTP was sent
  otp: string;
  type: 'verification' | 'password-reset';
  referenceEmail?: string; // Original user email (for admin approval cases)
  expiresAt: Date;
  createdAt: Date;
}

export interface IPasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// API response type
export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type ShiftType = 'morning' | 'evening' | 'night' | 'flexible';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day' | 'on-leave' | 'remote';

export interface IBreak {
  start: Date;
  end?: Date;
  type?: 'break' | 'prayer' | 'meal' | 'other';
  notes?: string;
}

export interface INamaz {
  start: Date;
  end?: Date;
  type?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}

export interface ITaskCompleted {
  task: string;
  description?: string;
  hoursSpent?: number;
  projectId?: string; // Reference to project if applicable
}

export interface IAttendanceRecord {
  id: string;
  employeeId: string;
  date: Date; // Just date portion (without time)
  checkIn: Date; // Full datetime
  checkOut?: Date; // Full datetime
  checkInLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
  };
  checkOutLocation?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
  };
  checkInReason?: string;
  checkOutReason?: string;
  status: AttendanceStatus;
  shift?: ShiftType; // Made optional to support flexible schedules
  tasksCompleted?: ITaskCompleted[];
  breaks?: IBreak[];
  totalBreakMinutes?: number;
  namaz?: INamaz[];
  totalNamazMinutes?: number;
  totalHours?: number;
  notes?: string;
  isRemote?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  url: string; // Cloudinary or other storage URL
  name: string; // File name
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  type: 'image' | 'video' | 'audio' | 'document';
  resource_type: string;
}

export interface ILeaveRequest {
  _id: string; // Standardize on string for MongoDB ObjectId
  employeeId: string;
  type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'other';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: Date;
  attachments?: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
}