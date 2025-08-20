// components/Projects/ProjectSettings.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { X, Users, Lock, Calendar, Tag, DollarSign, Trash2 } from 'lucide-react';

interface ProjectSettingsProps {
  projectId: string;
}

export default function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/projects/${projectId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch project');
      
      setProject(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && projectId) {
      fetchProject();
    }
  }, [session, projectId]);

  const updateProject = async (updatedFields: any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to update project');
      
      setProject(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/projects/${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to delete project');
      
      router.push('/dashboard/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setLoading(false);
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
          onClick={() => fetchProject()}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold">Project Settings</h1>
        <p className="text-gray-600 mt-1">Manage your project details and team</p>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={project.name}
            onChange={(e) => setProject({...project, name: e.target.value})}
            onBlur={() => updateProject({ name: project.name })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            value={project.description || ''}
            onChange={(e) => setProject({...project, description: e.target.value})}
            onBlur={() => updateProject({ description: project.description })}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Start Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setProject({...project, startDate: e.target.value})}
              onBlur={() => updateProject({ startDate: project.startDate })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Due Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setProject({...project, dueDate: e.target.value})}
              onBlur={() => updateProject({ dueDate: project.dueDate })}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={project.status}
              onChange={(e) => {
                setProject({...project, status: e.target.value});
                updateProject({ status: e.target.value });
              }}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={project.priority}
              onChange={(e) => {
                setProject({...project, priority: e.target.value});
                updateProject({ priority: e.target.value });
              }}
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
            <DollarSign className="w-4 h-4 mr-1" />
            Budget
          </label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={project.budget || ''}
            onChange={(e) => setProject({...project, budget: e.target.value ? parseFloat(e.target.value) : null})}
            onBlur={() => updateProject({ budget: project.budget })}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="private"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            checked={project.isPrivate}
            onChange={(e) => {
              setProject({...project, isPrivate: e.target.checked});
              updateProject({ isPrivate: e.target.checked });
            }}
          />
          <label htmlFor="private" className="ml-2 block text-sm text-gray-700 flex items-center">
            <Lock className="w-4 h-4 mr-1" />
            Private Project
          </label>
        </div>
        
        <div className="pt-6">
          <h3 className="text-lg font-medium flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-600" />
            Team Members
          </h3>
          
          <div className="mt-4 space-y-3">
            {project.teamMembers.map((member: any) => (
              <div key={member.userId._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{member.userId.name}</div>
                  <div className="text-sm text-gray-500">{member.userId.email}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {session?.user.id === project.createdBy._id && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-red-600 flex items-center">
              <Trash2 className="w-5 h-5 mr-2" />
              Danger Zone
            </h3>
            
            <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
              <p className="text-sm text-red-700 mb-4">
                Deleting this project will permanently remove all associated data including tasks and comments. This action cannot be undone.
              </p>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Project
              </button>
            </div>
          </div>
        )}
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project and all its associated data? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={deleteProject}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
              >
                {loading ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}