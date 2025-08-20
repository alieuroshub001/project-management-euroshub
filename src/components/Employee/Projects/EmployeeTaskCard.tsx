// components/Projects/EmployeeTaskCard.tsx
'use client';
import { Clock, CheckCircle, AlertCircle, Pause } from 'lucide-react';

export default function EmployeeTaskCard({ task, onClick }: { task: any, onClick: () => void }) {

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

  return (
    <div 
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-lg line-clamp-1">{task.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor()}`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex flex-wrap gap-2">
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
          <span className="capitalize">{task.status.replace('_', ' ')}</span>
        </span>
        
        {task.project && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
            {task.project.name}
          </span>
        )}
        
        {task.dueDate && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            new Date(task.dueDate) < new Date() && task.status !== 'completed' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        
        {task.estimatedHours && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
            Est: {task.estimatedHours}h
          </span>
        )}
        
        {task.actualHours > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
            Actual: {task.actualHours}h
          </span>
        )}
      </div>
    </div>
  );
}