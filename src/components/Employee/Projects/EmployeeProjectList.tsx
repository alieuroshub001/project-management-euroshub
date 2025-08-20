// components/Projects/EmployeeProjectList.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Filter } from 'lucide-react';
import EmployeeProjectCard from './EmployeeProjectCard';

export default function EmployeeProjectList() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let url = '/api/employee/projects';
      const params = new URLSearchParams();

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch projects');
      
      setProjects(data.data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProjects();
    }
  }, [session, searchTerm, statusFilter]);

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
          onClick={() => fetchProjects()}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">My Projects</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search my projects..."
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
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No projects assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'You are not assigned to any projects yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <EmployeeProjectCard key={project._id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}