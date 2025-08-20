// models/Project.ts
import mongoose, { Schema, Model } from 'mongoose';
import { IProject } from '@/types/project';

const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'not_started',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  startDate: { type: Date },
  dueDate: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamMembers: [{ 
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['manager', 'member', 'viewer'], default: 'member' }
  }],
  client: { type: Schema.Types.ObjectId, ref: 'Client' },
  budget: { type: Number },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  attachments: [{
    public_id: String,
    secure_url: String,
    original_filename: String,
    format: String,
    bytes: Number,
    type: String,
    resource_type: String,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  tags: [{ type: String }]
}, { timestamps: true });

// Indexes for better query performance
ProjectSchema.index({ name: 'text', description: 'text' });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ priority: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ teamMembers: 1 });
ProjectSchema.index({ dueDate: 1 });

const Project: Model<IProject> = 
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;