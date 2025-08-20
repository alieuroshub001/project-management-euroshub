// components/Projects/TaskCard.tsx
'use client';
import { useState } from 'react';
import { ChevronRight, CheckCircle, AlertCircle, Clock, Pause, MoreVertical } from 'lucide-react';
import TaskModal from './TaskModal';

interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    dueDate?: string;
    assignedTo?: {
      _id: string;
      name: string;
      email: string;
    };
    createdBy: {
      _id: string;
      name: string;
      email: string;
    };
    estimatedHours?: number;
    actualHours: number;
  };
  onUpdate: () => void;
}

export default function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [showModal, setShowModal] = useState(false);

  const getStatusIcon = () => {
    switch (task.status) {
      case 'todo': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <ChevronRight className="w-4 h-4" />;
      case 'in_review': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'blocked': return <Pause className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <>
      <div 
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{task.title}</h3>
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        
        {task.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
          </span>
          
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor()}`}>
            {task.priority} priority
          </span>
          
          {task.assignedTo && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
              {task.assignedTo.name}
            </span>
          )}
          
          {task.dueDate && (
            <span className={`text-xs px-2 py-1 rounded-full ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
              Due: {new Date(task.dueDate).toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
            </span>
          )}
          
          {task.estimatedHours && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
              Est: {task.estimatedHours}h
            </span>
          )}
        </div>
      </div>
      
      {showModal && (
        <TaskModal 
          taskId={task._id} 
          onClose={() => {
            setShowModal(false);
            onUpdate();
          }} 
        />
      )}
    </>
  );
}