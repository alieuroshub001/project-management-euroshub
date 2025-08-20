// components/Projects/EmployeeTaskModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, MessageSquare, Paperclip } from 'lucide-react';

interface EmployeeTaskModalProps {
  taskId: string;
  onClose: () => void;
}

export default function EmployeeTaskModal({ taskId, onClose }: EmployeeTaskModalProps) {
  const { data: session } = useSession();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [status, setStatus] = useState('');
  const [actualHours, setActualHours] = useState(0);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employee/tasks/${taskId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch task');
      
      setTask(data.data);
      setComments(data.data.comments || []);
      setStatus(data.data.status);
      setActualHours(data.data.actualHours || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const updateTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employee/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          actualHours,
          comment: newComment.trim() ? newComment : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to update task');
      
      fetchTask();
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };



  if (!task) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-500">{error || 'Task not found'}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Task Details</h2>
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

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div>
            <h3 className="text-xl font-semibold">{task.title}</h3>
            
            {task.description && (
              <div className="prose max-w-none mt-2">
                <p>{task.description}</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
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
                Actual Hours
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={actualHours}
                onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.5"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
              Comments
            </h4>
            
            <div className="space-y-4 mt-4">
              {comments.map((comment, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="font-medium">{comment.user.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
              
              <div className="mt-4">
                <textarea
                  placeholder="Add a comment..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={updateTask}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}