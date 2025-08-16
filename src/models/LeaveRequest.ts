import mongoose, { Schema, Model } from 'mongoose';
import { ILeaveRequest } from '@/types';

const LeaveRequestSchema: Schema = new Schema({
  employeeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: {
    type: String,
    enum: ['vacation', 'sick', 'personal', 'bereavement', 'other'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  attachments: [{ 
    public_id: String,
    secure_url: String,
    original_filename: String,
    format: String,
    bytes: Number,
    type: String,
    resource_type: String
  }]
}, { timestamps: true });

// Indexes
LeaveRequestSchema.index({ employeeId: 1 });
LeaveRequestSchema.index({ status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });
LeaveRequestSchema.index({ type: 1 });

const LeaveRequest: Model<ILeaveRequest> = 
  mongoose.models.LeaveRequest || 
  mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);

export default LeaveRequest;