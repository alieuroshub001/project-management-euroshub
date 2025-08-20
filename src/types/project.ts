// Project and Task Module Types

// Project Types
export interface IProject {
  id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: Date;
  dueDate?: Date;
  createdBy: string; // User ID
  teamMembers: Array<{
    userId: string;
    role: 'manager' | 'member' | 'viewer';
  }>;
  client?: string; // Client ID
  budget?: number;
  progress: number;
  attachments?: IAttachment[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectWithStats extends IProject {
  taskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  teamMemberDetails: Array<{
    userId: string;
    name: string;
    email: string;
    role: 'manager' | 'member' | 'viewer';
    taskCount: number;
  }>;
}

// Task Types
export interface ITask {
  id: string;
  title: string;
  description?: string;
  project: string; // Project ID
  status: 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  assignedTo?: string; // User ID
  createdBy: string; // User ID
  completedAt?: Date;
  estimatedHours?: number;
  actualHours: number;
  dependencies?: string[]; // Task IDs
  attachments?: IAttachment[];
  comments?: Array<{
    content: string;
    user: string; // User ID
    createdAt: Date;
  }>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Supporting Types
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

export interface ITaskCompleted {
  task: string;
  description?: string;
  hoursSpent?: number;
  projectId?: string; // Reference to project if applicable
}