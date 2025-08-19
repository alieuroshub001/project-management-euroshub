// models/AttendanceRecord.ts - FIXED VERSION: Added proper night shift time calculations
import mongoose, { Schema, Model, Document, CallbackError } from 'mongoose';
import { 
  IAttendanceRecord, 
  IBreak, 
  INamaz, 
  ITaskCompleted,
  AttendanceStatus,
  ShiftType
} from '@/types';
import { addDays, differenceInMinutes, isBefore, isAfter } from 'date-fns';

// Define proper types for schema validation functions
interface AttendanceRecordDocument extends Document {
  employeeId: Schema.Types.ObjectId;
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
  shift: ShiftType;
  tasksCompleted?: ITaskCompleted[];
  breaks?: IBreak[];
  totalBreakMinutes: number;
  namaz?: INamaz[];
  totalNamazMinutes: number;
  totalHours?: number;
  notes?: string;
  isRemote: boolean;
  deviceInfo?: {
    os?: string;
    browser?: string;
    ipAddress?: string;
  };
}

// Helper function to get shift end time considering night shift boundary crossing
const getShiftEndTime = (checkInTime: Date, shift: string): Date => {
  const checkInHour = checkInTime.getHours();
  let endTime = new Date(checkInTime);
  
  switch (shift) {
    case 'night':
      // Night shift: 12am-8am
      if (checkInHour >= 18) {
        // If checking in evening (6pm or later), shift ends next day at 8am
        endTime = addDays(checkInTime, 1);
        endTime.setHours(8, 0, 0, 0);
      } else if (checkInHour < 8) {
        // If checking in early morning (before 8am), shift ends same day at 8am
        endTime.setHours(8, 0, 0, 0);
      } else {
        // If checking in during day (unusual for night shift), end at 8am next day
        endTime = addDays(checkInTime, 1);
        endTime.setHours(8, 0, 0, 0);
      }
      break;
    case 'evening':
      // Evening shift: 4pm-12am
      endTime.setHours(23, 59, 59, 999); // End of day
      break;
    case 'morning':
      // Morning shift: 8am-4pm
      endTime.setHours(16, 0, 0, 0);
      break;
    default:
      // Flexible shift - use 24 hours from check-in
      endTime = addDays(checkInTime, 1);
      break;
  }
  
  return endTime;
};

// Helper function to calculate working hours with proper night shift handling
const calculateTotalHours = (checkInTime: Date, checkOutTime: Date, shift: string, breakMinutes = 0, namazMinutes = 0): number => {
  const workedMinutes = differenceInMinutes(checkOutTime, checkInTime);
  const netMinutes = Math.max(0, workedMinutes - breakMinutes - namazMinutes);
  return parseFloat((netMinutes / 60).toFixed(2));
};

const BreakSchema = new Schema<IBreak>({
  start: { type: Date, required: true },
  end: { type: Date },
  type: { 
    type: String, 
    enum: ['break', 'prayer', 'meal', 'other'],
    default: 'break'
  },
  notes: { type: String, maxlength: 200 }
});

const NamazSchema = new Schema<INamaz>({
  start: { type: Date, required: true },
  end: { type: Date },
  type: {
    type: String,
    enum: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
  }
});

const TaskSchema = new Schema<ITaskCompleted>({
  task: { type: String, required: true },
  description: { type: String },
  hoursSpent: { type: Number, min: 0 },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' }
});

const LocationSchema = new Schema({
  type: { 
    type: String, 
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: (coords: number[]) => {
        return Array.isArray(coords) && coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 &&
               coords[1] >= -90 && coords[1] <= 90;
      },
      message: 'Invalid coordinates format. Expected [longitude, latitude] with valid values.'
    }
  },
  address: { type: String }
});

const AttendanceRecordSchema: Schema = new Schema(
  {
    employeeId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    date: { 
      type: Date, 
      required: true,
      transform: (val: Date) => {
        val.setHours(0, 0, 0, 0);
        return val;
      }
    },
    checkIn: { 
      type: Date, 
      required: true,
      validate: {
        validator: function(value: Date) {
          return value <= new Date();
        },
        message: 'Check-in time cannot be in the future'
      }
    },
    checkOut: { 
      type: Date,
      validate: [
        {
          validator: function(this: AttendanceRecordDocument, value: Date) {
            if (!value) return true;
            
            // For night shift, allow checkout on next day
            if (this.shift === 'night') {
              const checkInHour = this.checkIn.getHours();
              // If checked in during evening/night, allow checkout next day
              if (checkInHour >= 18) {
                const nextDay8am = addDays(this.checkIn, 1);
                nextDay8am.setHours(8, 0, 0, 0);
                return value <= nextDay8am && value > this.checkIn;
              }
            }
            
            return value > this.checkIn;
          },
          message: 'Check-out time must be after check-in time and within shift hours'
        },
        {
          validator: function(this: AttendanceRecordDocument, value: Date) {
            if (!value) return true;
            
            // Allow some flexibility for future checkout (max 1 hour)
            const maxCheckoutTime = new Date();
            maxCheckoutTime.setHours(maxCheckoutTime.getHours() + 1);
            return value <= maxCheckoutTime;
          },
          message: 'Check-out time cannot be more than 1 hour in the future'
        }
      ]
    },
    checkInLocation: {
      type: LocationSchema,
      validate: {
        validator: function(this: AttendanceRecordDocument, value: unknown) {
          if (this.isRemote && !value) {
            return false;
          }
          return true;
        },
        message: 'Remote check-ins require location data'
      }
    },
    checkOutLocation: LocationSchema,
    checkInReason: { 
      type: String,
      maxlength: 500,
      required: function(this: AttendanceRecordDocument) {
        return this.status === 'late';
      }
    },
    checkOutReason: { 
      type: String,
      maxlength: 500 
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'remote'],
      default: 'present',
      validate: {
        validator: function(this: AttendanceRecordDocument, value: string) {
          if (value === 'absent' && this.checkIn) {
            return false;
          }
          return true;
        },
        message: 'Cannot have check-in time with absent status'
      }
    },
    shift: {
      type: String,
      enum: ['morning', 'evening', 'night', 'flexible'],
      default: 'flexible'
    },
    tasksCompleted: [TaskSchema],
    breaks: [BreakSchema],
    totalBreakMinutes: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    namaz: [NamazSchema],
    totalNamazMinutes: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    totalHours: { 
      type: Number,
      min: 0,
      max: 24 
    },
    isRemote: {
      type: Boolean,
      default: false
    },
    notes: { 
      type: String,
      maxlength: 1000 
    },
    deviceInfo: {
      os: { type: String },
      browser: { type: String },
      ipAddress: { type: String }
    }
  },
  { 
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: Document, ret: Record<string, unknown>) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// UPDATED INDEXES - Removed unique constraint on employeeId + date
// This allows multiple check-ins per day for the same employee
AttendanceRecordSchema.index({ employeeId: 1 });
AttendanceRecordSchema.index({ date: 1 });
AttendanceRecordSchema.index({ checkIn: 1 });
AttendanceRecordSchema.index({ 'checkInLocation.coordinates': '2dsphere' });
AttendanceRecordSchema.index({ 'checkOutLocation.coordinates': '2dsphere' });

// Compound indexes for efficient queries (but NOT unique)
AttendanceRecordSchema.index({ employeeId: 1, date: 1 }); // Removed unique: true
AttendanceRecordSchema.index({ date: 1, status: 1, isRemote: 1 });

// Add index for finding active records (without checkout)
AttendanceRecordSchema.index({ employeeId: 1, date: 1, checkOut: 1 });

// Define proper types for virtuals
interface AttendanceWithVirtuals extends AttendanceRecordDocument {
  calculatedHours: number;
  durationMinutes: number;
}

// Virtuals - UPDATED with proper night shift handling
AttendanceRecordSchema.virtual('calculatedHours').get(function(this: AttendanceWithVirtuals) {
  if (!this.checkOut) return 0;
  
  const breakHours = (this.totalBreakMinutes || 0) / 60;
  const namazHours = (this.totalNamazMinutes || 0) / 60;
  
  return calculateTotalHours(this.checkIn, this.checkOut, this.shift, this.totalBreakMinutes, this.totalNamazMinutes);
});

AttendanceRecordSchema.virtual('durationMinutes').get(function(this: AttendanceWithVirtuals) {
  if (!this.checkOut) return 0;
  return differenceInMinutes(this.checkOut, this.checkIn);
});

// UPDATED Pre-save hooks with proper night shift handling
AttendanceRecordSchema.pre('save', function(this: AttendanceRecordDocument, next: (error?: CallbackError) => void) {
  // Normalize date to midnight
  if (this.date) {
    this.date.setHours(0, 0, 0, 0);
  }

  // Calculate break minutes
  if (this.breaks?.length) {
    this.totalBreakMinutes = this.breaks.reduce((total: number, breakItem: IBreak) => {
      if (breakItem.end) {
        return total + differenceInMinutes(breakItem.end, breakItem.start);
      }
      return total;
    }, 0);
  }

  // Calculate namaz minutes
  if (this.namaz?.length) {
    this.totalNamazMinutes = this.namaz.reduce((total: number, namazItem: INamaz) => {
      if (namazItem.end) {
        return total + differenceInMinutes(namazItem.end, namazItem.start);
      }
      return total;
    }, 0);
  }

  // Calculate total hours if checked out - UPDATED with night shift support
  if (this.checkOut) {
    this.totalHours = calculateTotalHours(
      this.checkIn, 
      this.checkOut, 
      this.shift, 
      this.totalBreakMinutes, 
      this.totalNamazMinutes
    );
  }

  // Auto-set status based on check-in time and shift - UPDATED for night shift
  if (!this.status || this.status === 'present') {
    const checkInHour = this.checkIn.getHours();
    const checkInMinutes = this.checkIn.getMinutes();
    
    switch (this.shift) {
      case 'morning':
        // Morning shift: 8am-4pm, late if after 9am
        if (checkInHour > 9 || (checkInHour === 9 && checkInMinutes > 0)) {
          this.status = 'late';
        }
        break;
      case 'evening':
        // Evening shift: 4pm-12am, late if after 5pm
        if (checkInHour > 17 || (checkInHour === 17 && checkInMinutes > 0)) {
          this.status = 'late';
        }
        break;
      case 'night':
        // Night shift: 12am-8am
        // Late if:
        // - Checking in after 12:30am (for night shift starting at midnight)
        // - Checking in after 8:30pm if starting evening (for 12am start)
        if (checkInHour < 8) {
          // Early morning check-in (0-7:59am)
          if (checkInHour > 0 || (checkInHour === 0 && checkInMinutes > 30)) {
            this.status = 'late';
          }
        } else if (checkInHour >= 18) {
          // Evening check-in for night shift starting at midnight
          if (checkInHour > 20 || (checkInHour === 20 && checkInMinutes > 30)) {
            this.status = 'late';
          }
        }
        break;
      case 'flexible':
      default:
        // Flexible shifts are rarely marked as late
        this.status = 'present';
        break;
    }
  }

  // Auto-detect remote work if location is far from office
  if (this.checkInLocation && this.checkInLocation.coordinates) {
    const OFFICE_COORDS: [number, number] = [74.3587, 31.5204]; // Example: Lahore coordinates
    const distance = haversineDistance(
      this.checkInLocation.coordinates as [number, number],
      OFFICE_COORDS
    );
    this.isRemote = distance > 5000; // 5km threshold
  }

  next();
});

// Helper function to calculate distance between coordinates (Haversine formula)
function haversineDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Define proper return types for static methods
interface TeamAttendanceResult {
  checkIn: Date;
  checkOut?: Date;
  status: string;
  totalHours?: number;
  isRemote: boolean;
  employee: {
    name: string;
    employeeId: string;
  };
}

interface LocationStatsResult {
  _id: string;
  count: number;
  avgHours: number;
}

// Static methods
AttendanceRecordSchema.statics.getEmployeeAttendance = function(
  employeeId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ checkIn: 1 });
};

AttendanceRecordSchema.statics.getTeamAttendance = function(
  teamMemberIds: string[], 
  date: Date
): Promise<TeamAttendanceResult[]> {
  return this.aggregate([
    { $match: { 
      employeeId: { $in: teamMemberIds },
      date 
    }},
    { $lookup: {
      from: 'users',
      localField: 'employeeId',
      foreignField: '_id',
      as: 'employee'
    }},
    { $unwind: '$employee' },
    { $project: {
      checkIn: 1,
      checkOut: 1,
      status: 1,
      totalHours: 1,
      isRemote: 1,
      'employee.name': 1,
      'employee.employeeId': 1
    }},
    { $sort: { 'employee.name': 1 } }
  ]);
};

AttendanceRecordSchema.statics.getLocationStats = function(
  locationCoords: [number, number], 
  radius: number, 
  date: Date
): Promise<LocationStatsResult[]> {
  return this.aggregate([
    { $match: { 
      date,
      checkInLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: locationCoords
          },
          $maxDistance: radius
        }
      }
    }},
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
      avgHours: { $avg: '$totalHours' }
    }}
  ]);
};

// NEW: Method to get night shift records that span days
AttendanceRecordSchema.statics.getNightShiftRecords = function(
  employeeId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    employeeId,
    shift: 'night',
    $or: [
      { date: { $gte: startDate, $lte: endDate } },
      { 
        // Also include records where check-out spans to the next day
        checkIn: { $gte: startDate, $lte: endDate },
        checkOut: { $exists: true }
      }
    ]
  }).sort({ checkIn: 1 });
};

interface AttendanceRecordModel extends Model<IAttendanceRecord> {
  getEmployeeAttendance: (
    employeeId: string, 
    startDate: Date, 
    endDate: Date
  ) => Promise<IAttendanceRecord[]>;
  
  getTeamAttendance: (
    teamMemberIds: string[], 
    date: Date
  ) => Promise<TeamAttendanceResult[]>;
  
  getLocationStats: (
    locationCoords: [number, number], 
    radius: number, 
    date: Date
  ) => Promise<LocationStatsResult[]>;

  getNightShiftRecords: (
    employeeId: string, 
    startDate: Date, 
    endDate: Date
  ) => Promise<IAttendanceRecord[]>;
}

const AttendanceRecord = (mongoose.models.AttendanceRecord || 
  mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema)) as AttendanceRecordModel;

export default AttendanceRecord;