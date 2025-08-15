// components/employee/attendance/types.ts
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
