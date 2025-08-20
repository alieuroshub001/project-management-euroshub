// components/Projects/TaskModal.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  X,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Pause,
  Calendar,
  MessageSquare,
  Paperclip,
  Edit,
  Trash2,
} from 'lucide-react';

// ----- Local view-model types (match your UI usage) -----
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

interface UserRef {
  _id: string;
  name: string;
  role?: string;
}

interface CommentView {
  content: string;
  user: UserRef; // populated user
  createdAt: string | Date;
}

interface TaskView {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | Date | null;
  estimatedHours?: number | null;
  actualHours: number;
  assignedTo?: UserRef | null;
  createdBy: UserRef;
  comments?: CommentView[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskModal({ taskId, onClose }: TaskModalProps) {
  const { data: session } = useSession();

  const [task, setTask] = useState<TaskView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editing, setEditing] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentView[]>([]);
  const [newComment, setNewComment] = useState<string>('');

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/tasks/${taskId}`);
      const data: ApiResponse<TaskView> = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch task');

      if (data.data) {
        setTask(data.data);
        setComments(data.data.comments ?? []);
      } else {
        setTask(null);
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateTask = async (
    updatedFields: Partial<
      Pick<
        TaskView,
        'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'estimatedHours' | 'actualHours'
      >
    >
  ) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      const data: ApiResponse<TaskView> = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update task');

      if (data.data) {
        setTask(data.data);
        setEditing(false);
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/tasks/${taskId}`, { method: 'DELETE' });
      const data: ApiResponse<null> = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to delete task');

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      const data: ApiResponse<CommentView> = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add comment');

      if (data.data) {
        setComments((prev) => [...prev, data.data!]);
        setNewComment('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!task) return <AlertCircle className="w-5 h-5" />;

    switch (task.status) {
      case 'todo':
        return <Clock className="w-5 h-5" />;
      case 'in_progress':
        return <ChevronRight className="w-5 h-5" />;
      case 'in_review':
        return <AlertCircle className="w-5 h-5" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'blocked':
        return <Pause className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    if (!task) return 'bg-gray-100 text-gray-800';

    switch (task.status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = () => {
    if (!task) return 'bg-gray-100 text-gray-800';

    switch (task.priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h2 className="text-lg font-semibold">Task Details</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-4 bg-red-100 text-red-700 text-sm">{error}</div>}

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  value={task.description ?? ''}
                  onChange={(e) => setTask({ ...task, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={task.status}
                    onChange={(e) => setTask({ ...task, status: e.target.value as TaskStatus })}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={task.priority}
                    onChange={(e) => setTask({ ...task, priority: e.target.value as TaskPriority })}
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
                  value={
                    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
                  }
                  onChange={(e) =>
                    setTask({ ...task, dueDate: e.target.value ? e.target.value : null })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={task.estimatedHours ?? ''}
                  onChange={(e) =>
                    setTask({
                      ...task,
                      estimatedHours: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Hours
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={task.actualHours ?? 0}
                  onChange={(e) =>
                    setTask({
                      ...task,
                      actualHours: e.target.value ? parseFloat(e.target.value) : 0,
                    })
                  }
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    updateTask({
                      title: task.title,
                      description: task.description,
                      status: task.status,
                      priority: task.priority,
                      dueDate: task.dueDate ?? undefined,
                      estimatedHours: task.estimatedHours ?? undefined,
                      actualHours: task.actualHours ?? 0,
                    })
                  }
                  disabled={loading || !task.title.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold">{task.title}</h3>

                <div className="flex space-x-2">
                  {(session?.user?.id === task.createdBy._id ||
                    session?.user?.role === 'superadmin') && (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Edit task"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={deleteTask}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete task"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {task.description && (
                <div className="prose max-w-none">
                  <p>{task.description}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor()}`}>
                  <span className="capitalize">{task.status.replace('_', ' ')}</span>
                </span>

                <span className={`text-sm px-2 py-1 rounded-full ${getPriorityColor()}`}>
                  {task.priority} priority
                </span>

                {task.assignedTo && (
                  <span className="text-sm px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                    <User className="w-4 h-4 inline mr-1" />
                    {task.assignedTo.name}
                  </span>
                )}

                {task.dueDate && (
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${
                      isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                    {isOverdue && ' (Overdue)'}
                  </span>
                )}

                {typeof task.estimatedHours === 'number' && task.estimatedHours >= 0 && (
                  <span className="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    Est: {task.estimatedHours}h
                  </span>
                )}

                {task.actualHours > 0 && (
                  <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-800">
                    Actual: {task.actualHours}h
                  </span>
                )}
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
                    />
                    <div className="flex justify-between items-center mt-2">
                      <button className="p-2 text-gray-500 hover:text-gray-700" type="button">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        onClick={addComment}
                        disabled={loading || !newComment.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300"
                      >
                        {loading ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
