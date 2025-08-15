// components/employee/attendance/types.ts - FIXED VERSION
export interface AttendanceRecord {
  _id: string;
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
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
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave' | 'remote';
  shift?: 'morning' | 'evening' | 'night' | 'flexible';
  tasksCompleted?: Array<{
    task: string;
    description?: string;
    hoursSpent?: number;
    projectId?: string;
  }>;
  breaks?: Array<{
    start: string;
    end?: string;
    type?: 'break' | 'prayer' | 'meal' | 'other';
    notes?: string;
  }>;
  totalBreakMinutes?: number;
  namaz?: Array<{
    start: string;
    end?: string;
    type?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  }>;
  totalNamazMinutes?: number;
  totalHours?: number;
  notes?: string;
  isRemote?: boolean;
  createdAt: string;
  updatedAt: string;
  calculatedHours?: number;
  durationMinutes?: number;
}

// Minimal interface for CheckInModal props
export interface AttendanceRecordBasic {
  checkIn: string;
  status: string;
  shift: string;
  checkInReason?: string;
  [key: string]: unknown;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  remoteDays: number;
  totalHours: number;
  avgHours: number;
  totalBreakMinutes: number;
  totalNamazMinutes: number;
}

export interface AttendanceResponse {
  data: AttendanceRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: AttendanceStats;
}

// Additional interfaces for API payloads
export interface CheckInPayload {
  shift?: 'morning' | 'evening' | 'night' | 'flexible';
  checkInReason?: string;
  location?: {
    longitude: number;
    latitude: number;
    address?: string;
  };
  notes?: string;
  forceCheckIn?: boolean;
  deviceInfo?: {
    os: string;
    browser: string;
    ipAddress: string;
  };
}

export interface CheckOutPayload {
  action: 'checkout';
  checkOutReason?: string;
  tasksCompleted: Array<{
    task: string;
    description?: string;
    hoursSpent?: number;
    projectId?: string;
  }>;
  location?: {
    longitude: number;
    latitude: number;
    address?: string;
  };
  notes?: string;
  totalTaskHours?: number;
}

export interface BreakPayload {
  action: 'break-start' | 'break-end';
  recordId: string;
  breakType?: 'break' | 'meal' | 'other';
  breakNotes?: string;
}

export interface NamazPayload {
  action: 'namaz-start' | 'namaz-end';
  recordId: string;
  namazType?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
}