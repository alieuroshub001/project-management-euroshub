// components/Projects/ProjectStats.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, BarChart, Calendar } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface ProjectStatsProps {
  projectId: string;
}

export default function ProjectStats({ projectId }: ProjectStatsProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/projects/${projectId}/stats`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to fetch stats');
      
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && projectId) {
      fetchStats();
    }
  }, [session, projectId]);

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
          onClick={() => fetchStats()}
          className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
        No statistics available
      </div>
    );
  }

  // Prepare data for charts
  const statusData = {
    labels: stats.statusDistribution.map((item: any) => item._id.replace('_', ' ')),
    datasets: [
      {
        label: 'Tasks by Status',
        data: stats.statusDistribution.map((item: any) => item.count),
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)', // indigo
          'rgba(59, 130, 246, 0.7)', // blue
          'rgba(234, 179, 8, 0.7)', // yellow
          'rgba(16, 185, 129, 0.7)', // green
          'rgba(239, 68, 68, 0.7)', // red
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const priorityData = {
    labels: stats.priorityDistribution.map((item: any) => item._id),
    datasets: [
      {
        label: 'Tasks by Priority',
        data: stats.priorityDistribution.map((item: any) => item.count),
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)', // green
          'rgba(59, 130, 246, 0.7)', // blue
          'rgba(234, 179, 8, 0.7)', // yellow
          'rgba(239, 68, 68, 0.7)', // red
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const completionTrendData = {
    labels: stats.completionTrend.map((item: any) => item._id),
    datasets: [
      {
        label: 'Tasks Completed',
        data: stats.completionTrend.map((item: any) => item.count),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
            <h3 className="font-medium">Tasks by Status</h3>
          </div>
          <div className="h-64">
            <Pie data={statusData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <PieChart className="w-5 h-5 mr-2 text-indigo-600" />
            <h3 className="font-medium">Tasks by Priority</h3>
          </div>
          <div className="h-64">
            <Pie data={priorityData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center mb-4">
          <BarChart className="w-5 h-5 mr-2 text-indigo-600" />
          <h3 className="font-medium">Completion Trend</h3>
        </div>
        <div className="h-64">
          <Bar 
            data={completionTrendData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
            <h3 className="font-medium">Estimated vs Actual Hours</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated:</span>
              <span className="font-medium">{stats.hoursComparison.totalEstimated || 0} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Actual:</span>
              <span className="font-medium">{stats.hoursComparison.totalActual || 0} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Difference:</span>
              <span className={`font-medium ${
                (stats.hoursComparison.totalActual || 0) > (stats.hoursComparison.totalEstimated || 0) 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {((stats.hoursComparison.totalActual || 0) - (stats.hoursComparison.totalEstimated || 0)).toFixed(1)} hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}