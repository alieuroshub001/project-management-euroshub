// app/dashboard/employee/my-time-tracking/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Camera, 
  CheckSquare,
  Play,
  Pause,
  Square,
  Settings,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { TimeTracker } from '@/components/Employee/TimeTracker/Index';
import { formatTime, calculateProductivityScore } from '@/utils/timetracker';

interface TimeTrackingStats {
  todayStats: {
    totalMinutes: number;
    activeMinutes: number;
    pausedMinutes: number;
    screenshots: number;
    tasks: number;
    averageActivity: number;
  };
  weekStats: {
    totalMinutes: number;
    averageActivity: number;
    totalSessions: number;
    completedTasks: number;
  };
  monthStats: {
    totalHours: number;
    totalSessions: number;
    averageSessionDuration: number;
    productivityScore: number;
  };
}

interface RecentSession {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  duration: number;
  status: 'completed' | 'stopped';
  screenshots: number;
  tasks: number;
  averageActivity: number;
  projectName?: string;
}

export default function MyTimeTrackingPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<TimeTrackingStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('tracker');

  // Redirect if not authenticated or not an employee
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'employee') {
      redirect('/auth/signin');
    }
  }, [session, status]);

  // Fetch dashboard data
  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData();
    }
  }, [session?.user?.id]);

  const fetchDashboardData = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);

      // Fetch stats
      const statsResponse = await fetch(`/api/employee/time-tracker/stats?employeeId=${session.user.id}`);
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch recent sessions
      const sessionsResponse = await fetch(`/api/employee/time-tracker/sessions/recent?employeeId=${session.user.id}&limit=5`);
      const sessionsData = await sessionsResponse.json();

      if (sessionsData.success) {
        setRecentSessions(sessionsData.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProductivityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading time tracking dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Time Tracking</h1>
          <p className="text-gray-600">Monitor your productivity and work sessions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(stats.todayStats.activeMinutes * 60)}
                </div>
                <p className="text-sm text-gray-500">Active Time</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{stats.todayStats.screenshots} screenshots</span>
                  <span>{stats.todayStats.tasks} tasks</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(stats.weekStats.totalMinutes / 60)}h
                </div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{stats.weekStats.totalSessions} sessions</span>
                  <span>{stats.weekStats.averageActivity}% avg activity</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.monthStats.totalHours}h
                </div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{stats.monthStats.totalSessions} sessions</span>
                  <span>{Math.round(stats.monthStats.averageSessionDuration)}m avg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productivity Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Productivity Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`text-2xl font-bold ${getProductivityColor(stats.monthStats.productivityScore)}`}>
                  {stats.monthStats.productivityScore}%
                </div>
                <p className="text-sm text-gray-500">
                  {getProductivityLabel(stats.monthStats.productivityScore)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.monthStats.productivityScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracker
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Session History
          </TabsTrigger>
        </TabsList>

        {/* Time Tracker Tab */}
        <TabsContent value="tracker" className="mt-6">
          <TimeTracker />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Productivity Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Today's Activity</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${stats?.todayStats.averageActivity || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats?.todayStats.averageActivity || 0}%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Week Average</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${stats?.weekStats.averageActivity || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats?.weekStats.averageActivity || 0}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Your productivity has been{' '}
                      <span className="font-medium text-green-600">
                        {((stats?.weekStats.averageActivity || 0) - (stats?.todayStats.averageActivity || 0)) >= 0 ? 'improving' : 'declining'}
                      </span>{' '}
                      compared to your weekly average.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Work Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sessions This Week</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {stats?.weekStats.totalSessions || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Session Length</span>
                    <span className="text-lg font-medium text-gray-900">
                      {stats?.monthStats.averageSessionDuration ? Math.round(stats.monthStats.averageSessionDuration) : 0}m
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tasks Completed</span>
                    <span className="text-lg font-medium text-gray-900">
                      {stats?.weekStats.completedTasks || 0}
                    </span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <div key={day} className="space-y-1">
                          <div className="text-gray-500">{day}</div>
                          <div className={`h-8 rounded ${index < 5 ? 'bg-blue-200' : 'bg-gray-100'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Session History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No sessions found
                  </h3>
                  <p className="text-gray-600">
                    Start tracking time to see your session history here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{session.title}</h3>
                          {session.projectName && (
                            <p className="text-sm text-gray-600">{session.projectName}</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(session.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Camera className="h-4 w-4" />
                            {session.screenshots}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckSquare className="h-4 w-4" />
                            {session.tasks}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span>Activity: {session.averageActivity}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${session.averageActivity}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(session.startTime).toLocaleString()} -{' '}
                        {session.endTime ? new Date(session.endTime).toLocaleString() : 'Ongoing'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tips and Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Productivity Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Take regular breaks to maintain focus and avoid burnout</li>
                <li>• Set clear goals for each work session before you start</li>
                <li>• Review your activity patterns to identify your most productive hours</li>
                <li>• Use the task manager to track what you accomplish during sessions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}