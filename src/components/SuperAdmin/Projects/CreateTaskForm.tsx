// components/Projects/CreateTaskForm.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, User, Calendar } from 'lucide-react';

interface CreateTaskFormProps {
  projectId: string;
  onClose: () => void;
}

export default function CreateTaskForm({ projectId, onClose }: CreateTaskFormProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProjectUsers = async () => {
    try {
      const response = await fetch(`/api/superadmin/projects/${projectId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch project');
      
      const users = data.data.teamMembers.map((member: any) => ({
        _id: member.userId._id,
        name: member.userId.name,
        email: member.userId.email
      }));
      
      setAvailableUsers(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project users');
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectUsers();
    }
  }, [projectId]);

  const createTask = async () => {
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/superadmin/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          dueDate: dueDate || undefined,
          assignedTo: assignedTo || undefined,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to create task');
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Due Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              Assign To
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {availableUsers.map(user => (
                <option key={user._id} value={user._id}>{user.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Hours (optional)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="0"
              min="0"
              step="0.5"
            />
          </div>
          
          <div className="pt-4">
            <button
              onClick={createTask}
              disabled={loading || !title.trim()}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}