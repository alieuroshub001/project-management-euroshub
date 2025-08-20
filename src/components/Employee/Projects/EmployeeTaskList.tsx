// components/Projects/EmployeeTaskList.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Filter } from 'lucide-react';
import EmployeeTaskCard from './EmployeeTaskCard';
import EmployeeTaskModal from '@/components/Employee/Projects/EmployeeTaskModal';

export default function EmployeeTaskList({ projectId }: { projectId?: string }) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let url = '/api/employee/tasks';
      const params = new URLSearchParams();

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (projectId) params.append('projectId', projectId);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch tasks');
      
      setTasks(data.data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchTasks();
    }
  }, [session, searchTerm, statusFilter, projectId]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search my tasks..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tasks assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'You have no tasks assigned yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <EmployeeTaskCard 
              key={task._id} 
              task={task} 
              onClick={() => setSelectedTask(task._id)}
            />
          ))}
        </div>
      )}

      {selectedTask && (
        <EmployeeTaskModal 
          taskId={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}