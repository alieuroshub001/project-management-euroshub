// models/Task.ts
import mongoose, { Schema, Model } from 'mongoose';
import { ITask } from '@/types/project';

const TaskSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { 
    type: String, 
    enum: ['todo', 'in_progress', 'in_review', 'completed', 'blocked'],
    default: 'todo',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  dueDate: { type: Date },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date },
  estimatedHours: { type: Number },
  actualHours: { type: Number, default: 0 },
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
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
comments: [{
  content: String,
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  attachments: [{
    public_id: String,
    secure_url: String,
    original_filename: String,
    format: String,
    bytes: Number,
    type: String,
    resource_type: String
  }]
  }],
  tags: [{ type: String }]
}, { timestamps: true });

// Indexes for better query performance
TaskSchema.index({ title: 'text', description: 'text' });
TaskSchema.index({ project: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ dueDate: 1 });

const Task: Model<ITask> = 
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;