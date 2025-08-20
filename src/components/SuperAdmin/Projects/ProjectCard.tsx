// components/Projects/ProjectCard.tsx
'use client';
import Link from 'next/link';
import { Clock, CheckCircle, AlertCircle, Pause, XCircle, ChevronRight } from 'lucide-react';

interface ProjectCardProps {
  project: {
    _id: string;
    name: string;
    description?: string;
    status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    dueDate?: string;
    progress: number;
    taskCount: number;
    completedTaskCount: number;
    overdueTaskCount: number;
    createdBy: {
      _id: string;
      name: string;
      email: string;
    };
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const getStatusIcon = () => {
    switch (project.status) {
      case 'not_started': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <ChevronRight className="w-4 h-4" />;
      case 'on_hold': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (project.status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = () => {
    switch (project.priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const progressPercentage = Math.round(project.progress * 100) / 100;

  return (
    <Link href={`/dashboard/superadmin/projects/${project._id}`}>
      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-lg line-clamp-1">{project.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor()}`}>
            {project.priority}
          </span>
        </div>
        
        {project.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
        )}
        
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="capitalize">{project.status.replace('_', ' ')}</span>
            </div>
            <span className="text-gray-500">
              {project.completedTaskCount}/{project.taskCount} tasks
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div>
              {project.dueDate ? (
                new Date(project.dueDate).toLocaleDateString()
              ) : (
                'No due date'
              )}
            </div>
            <div>
              {project.overdueTaskCount > 0 && (
                <span className="text-red-500">{project.overdueTaskCount} overdue</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}