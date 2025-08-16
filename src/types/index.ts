// types/index.ts - Updated with proper mongoose interface
import { Document } from 'mongoose';

export type UserRole = 'superadmin' | 'admin' | 'hr' | 'employee' | 'client';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  phone?: string;
  profileImage?: string;
  verificationToken?: string;
  employeeId?: string;
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
  email: string;
  otp: string;
  type: 'verification' | 'password-reset';
  referenceEmail?: string;
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
  projectId?: string;
}

export interface IAttendanceRecord {
  id: string;
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  checkInLocation?: {
    type: 'Point';
    coordinates: [number, number];
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
  shift?: ShiftType;
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
  url: string;
  name: string;
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  bytes: number;
  type: 'image' | 'video' | 'audio' | 'document';
  resource_type: string;
}

// Base interface for leave request data
export interface ILeaveRequestBase {
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

// Interface for use in React components (with _id as string)
export interface ILeaveRequest extends ILeaveRequestBase {
  _id: string;
}

// Interface for Mongoose document (extends Document)
export interface ILeaveRequestDocument extends ILeaveRequestBase, Document {
  _id: string;
  // Virtual fields
  durationDays?: number;
  // Instance methods
  canBeEdited(): boolean;
  canBeCancelled(): boolean;
}

// Interface for Mongoose model static methods
export interface ILeaveRequestModel {
  hasOverlappingLeave(
    employeeId: string, 
    startDate: Date, 
    endDate: Date, 
    excludeId?: string
  ): Promise<boolean>;
}