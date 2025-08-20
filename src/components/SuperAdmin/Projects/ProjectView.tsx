// components/Projects/ProjectView.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Clock, CheckCircle, AlertCircle, Pause, XCircle, ChevronRight, Users, Settings, List, BarChart2, Plus } from 'lucide-react';
import Link from 'next/link';
import TaskList from './TaskList';
import ProjectStats from './ProjectStats';
import CreateTaskForm from './CreateTaskForm';

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
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
  teamMembers: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    role: 'manager' | 'member' | 'viewer';
  }>;
  client?: {
    _id: string;
    name: string;
    email: string;
  };
  budget?: number;
  tags?: string[];
}

export default function ProjectView() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats'>('tasks');
  const [showCreateTask, setShowCreateTask] = useState(false);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/projects/${id}`);
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
    if (session?.user && id) {
      fetchProject();
    }
  }, [session, id]);

  const getStatusIcon = () => {
    if (!project) return <AlertCircle className="w-5 h-5" />;
    
    switch (project.status) {
      case 'not_started': return <Clock className="w-5 h-5" />;
      case 'in_progress': return <ChevronRight className="w-5 h-5" />;
      case 'on_hold': return <Pause className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    if (!project) return 'bg-gray-100 text-gray-800';
    
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
    if (!project) return 'bg-gray-100 text-gray-800';
    
    switch (project.priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const progressPercentage = project ? Math.round(project.progress * 100) / 100 : 0;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-1">{project.description}</p>
            )}
          </div>
          
          {(session?.user.role === 'superadmin' || session?.user.id === project.createdBy._id) && (
            <Link
              href={`/dashboard/superadmin/projects/${project._id}/settings`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Project settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
            <span className="capitalize">{project.status.replace('_', ' ')}</span>
          </span>
          
          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor()}`}>
            {project.priority} priority
          </span>
          
          {project.client && (
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
              Client: {project.client.name}
            </span>
          )}
          
          {project.tags && project.tags.map((tag, index) => (
            <span key={index} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Progress</h3>
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold">{progressPercentage}%</span>
            <div className="w-3/4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Tasks</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-semibold">{project.completedTaskCount}</span>
              <span className="text-gray-500"> / {project.taskCount}</span>
            </div>
            <div className="text-sm text-gray-500">
              {project.overdueTaskCount > 0 && (
                <span className="text-red-500">{project.overdueTaskCount} overdue</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Team</h3>
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold">{project.teamMembers.length}</span>
            <div className="flex -space-x-2">
              {project.teamMembers.slice(0, 5).map((member, index) => (
                <div 
                  key={index} 
                  className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium"
                  title={member.userId.name}
                >
                  {member.userId.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {project.teamMembers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  +{project.teamMembers.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <List className="w-4 h-4 inline mr-1" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'stats' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart2 className="w-4 h-4 inline mr-1" />
            Statistics
          </button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateTask(true)}
          className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </button>
      </div>
      
      {activeTab === 'tasks' ? (
        <TaskList projectId={project._id} />
      ) : (
        <ProjectStats projectId={project._id} />
      )}
      
      {showCreateTask && (
        <CreateTaskForm 
          projectId={project._id} 
          onClose={() => {
            setShowCreateTask(false);
            fetchProject();
          }} 
        />
      )}
    </div>
  );
}