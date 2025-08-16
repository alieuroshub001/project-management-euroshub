import mongoose, { Schema, Model, CallbackError } from 'mongoose';
import { ILeaveRequestDocument } from '@/types';

// IMPORTANT: Delete the existing model if it exists to avoid schema conflicts
if (mongoose.models.LeaveRequest) {
  delete mongoose.models.LeaveRequest;
}

// Define attachment sub-schema with explicit Mixed type to avoid casting issues
const AttachmentSchema = new Schema({
  url: { 
    type: String, 
    required: [true, 'URL is required'] 
  },
  secure_url: { 
    type: String, 
    required: [true, 'Secure URL is required'] 
  },
  public_id: { 
    type: String, 
    required: [true, 'Public ID is required'] 
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'] 
  },
  original_filename: { 
    type: String, 
    required: [true, 'Original filename is required'] 
  },
  format: { 
    type: String, 
    required: [true, 'Format is required'] 
  },
  bytes: { 
    type: Number, 
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  type: { 
    type: String, 
    enum: {
      values: ['image', 'video', 'audio', 'document'],
      message: 'Type must be one of: image, video, audio, document'
    },
    required: [true, 'File type is required'] 
  },
  resource_type: { 
    type: String, 
    required: [true, 'Resource type is required'] 
  }
}, { 
  _id: false, // Disable _id for subdocuments
  strict: true // Ensure only defined fields are saved
});

// Define interfaces for better type safety
interface IAttachment {
  url: string;
  secure_url: string;
  public_id: string;
  name: string;
  original_filename: string;
  format: string;
  bytes: number;
  type: 'image' | 'video' | 'audio' | 'document';
  resource_type: string;
}

interface ILeaveRequestSchemaDocument extends ILeaveRequestDocument {
  attachments: IAttachment[];
  durationDays: number;
}

const LeaveRequestSchema: Schema = new Schema({
  employeeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Employee ID is required']
  },
  type: {
    type: String,
    enum: {
      values: ['vacation', 'sick', 'personal', 'bereavement', 'other'],
      message: 'Type must be one of: vacation, sick, personal, bereavement, other'
    },
    required: [true, 'Leave type is required']
  },
  startDate: { 
    type: Date, 
    required: [true, 'Start date is required'],
    validate: {
      validator: function(this: ILeaveRequestDocument, value: Date) {
        // Allow editing of existing requests
        if (!this.isNew) return true;
        
        // Start date should not be in the past (except for today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Start date cannot be in the past'
    }
  },
  endDate: { 
    type: Date, 
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: ILeaveRequestDocument, value: Date) {
        // End date should be >= start date
        return !this.startDate || value >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  reason: { 
    type: String, 
    required: [true, 'Reason is required'],
    trim: true,
    minlength: [10, 'Reason must be at least 10 characters long'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'cancelled'],
      message: 'Status must be one of: pending, approved, rejected, cancelled'
    },
    default: 'pending'
  },
  reviewedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: false
  },
  reviewedAt: { 
    type: Date,
    required: false
  },
  // FIXED: Use explicit array definition with proper schema
  attachments: [AttachmentSchema] // Direct array definition instead of wrapping in object
}, { 
  timestamps: true,
  strict: true, // Only allow defined schema fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add validation for attachments array length
LeaveRequestSchema.path('attachments').validate(function(attachments: IAttachment[]) {
  return attachments.length <= 5;
}, 'Maximum 5 attachments allowed');

// Virtual field for calculating leave duration in days
LeaveRequestSchema.virtual('durationDays').get(function(this: ILeaveRequestSchemaDocument) {
  if (!this.startDate || !this.endDate) return 0;
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
});

// Pre-save middleware to validate date ranges
LeaveRequestSchema.pre('save', function(this: ILeaveRequestSchemaDocument, next: (error?: CallbackError) => void) {
  if (this.startDate && this.endDate) {
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    
    if (endDate < startDate) {
      return next(new Error('End date must be after or equal to start date'));
    }
    
    // Calculate maximum leave duration (e.g., 30 days)
    const maxDuration = 30;
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    
    if (duration > maxDuration) {
      return next(new Error(`Leave duration cannot exceed ${maxDuration} days`));
    }
  }
  
  // Set reviewedAt when status changes from pending
  if (this.isModified('status') && this.status !== 'pending' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  
  next();
});

// Compound indexes for better query performance
LeaveRequestSchema.index({ employeeId: 1, startDate: -1 });
LeaveRequestSchema.index({ employeeId: 1, status: 1 });
LeaveRequestSchema.index({ status: 1, startDate: -1 });
LeaveRequestSchema.index({ type: 1, status: 1 });
LeaveRequestSchema.index({ 
  employeeId: 1, 
  startDate: 1, 
  endDate: 1, 
  status: 1 
});

// Define interface for static methods
interface ILeaveRequestModel extends Model<ILeaveRequestDocument> {
  hasOverlappingLeave(
    employeeId: string, 
    startDate: Date, 
    endDate: Date, 
    excludeId?: string
  ): Promise<boolean>;
}

// Static method to check for overlapping leaves
LeaveRequestSchema.statics.hasOverlappingLeave = async function(
  employeeId: string, 
  startDate: Date, 
  endDate: Date, 
  excludeId?: string
): Promise<boolean> {
  const query: mongoose.FilterQuery<ILeaveRequestDocument> = {
    employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const overlapping = await this.findOne(query);
  return !!overlapping;
};

// Instance methods
LeaveRequestSchema.methods.canBeEdited = function(this: ILeaveRequestDocument) {
  return this.status === 'pending';
};

LeaveRequestSchema.methods.canBeCancelled = function(this: ILeaveRequestDocument) {
  return this.status === 'pending' || this.status === 'approved';
};

// Create the model with explicit typing
const LeaveRequest = mongoose.model<ILeaveRequestDocument>('LeaveRequest', LeaveRequestSchema) as ILeaveRequestModel;

export default LeaveRequest;