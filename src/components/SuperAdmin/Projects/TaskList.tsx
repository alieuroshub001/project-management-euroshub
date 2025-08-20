// components/Projects/TaskList.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronRight, CheckCircle, AlertCircle, Clock, Pause } from 'lucide-react';
import TaskCard from './TaskCard';

interface Task {
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
}

interface TaskListProps {
  projectId: string;
}

export default function TaskList({ projectId }: TaskListProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let url = `/api/superadmin/projects/${projectId}/tasks`;
      const params = new URLSearchParams();

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (assignedToFilter !== 'all') {
        params.append('assignedTo', assignedToFilter === 'me' ? 'me' : assignedToFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch tasks');
      
      setTasks(data.data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && projectId) {
      fetchTasks();
    }
  }, [session, projectId, statusFilter, priorityFilter, assignedToFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <ChevronRight className="w-4 h-4" />;
      case 'in_review': return <AlertCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'blocked': return <Pause className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        <p className="text-sm">{error}</p>
        <button 
          onClick={() => fetchTasks()}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        
        <div className="relative">
          <select
            value={assignedToFilter}
            onChange={(e) => setAssignedToFilter(e.target.value)}
            className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Assigned To: Anyone</option>
            <option value="me">Assigned To: Me</option>
            {/* You could add more team members here if needed */}
          </select>
        </div>
      </div>
      
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter !== 'all' || priorityFilter !== 'all' || assignedToFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'This project has no tasks yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onUpdate={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
}