// components/Employee/TimeTracker/ActivityChart.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  Keyboard, 
  Mouse, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Monitor,
  Zap
} from 'lucide-react';
import { ITimeTrackerSession } from '@/types';

interface ActivityChartProps {
  session: ITimeTrackerSession;
}

interface ActivityData {
  time: string;
  timestamp: number;
  activity: number;
  keystrokes: number;
  mouseClicks: number;
  mouseMoves: number;
  scrolls: number;
  isIdle: boolean;
  application?: string;
}

const ACTIVITY_COLORS = {
  high: '#10b981', // green
  medium: '#f59e0b', // yellow
  low: '#ef4444', // red
  idle: '#6b7280' // gray
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ActivityChart: React.FC<ActivityChartProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Process activity data
  const processActivityData = (): ActivityData[] => {
    if (!session.activityLevels || session.activityLevels.length === 0) {
      return [];
    }

    return session.activityLevels.map((activity, index) => ({
      time: new Date(activity.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      timestamp: new Date(activity.timestamp).getTime(),
      activity: activity.productivityScore,
      keystrokes: activity.keystrokes,
      mouseClicks: activity.mouseClicks,
      mouseMoves: activity.mouseMoves,
      scrolls: activity.scrolls,
      isIdle: activity.isIdle,
      application: activity.activeApplicationName
    }));
  };

  const activityData = processActivityData();

  // Calculate activity statistics
  const calculateStats = () => {
    if (activityData.length === 0) {
      return {
        averageActivity: 0,
        totalKeystrokes: 0,
        totalMouseClicks: 0,
        totalMouseMoves: 0,
        totalScrolls: 0,
        idleTime: 0,
        activeTime: 0,
        peakActivity: 0,
        lowActivity: 0,
        activityDistribution: []
      };
    }

    const totalKeystrokes = activityData.reduce((sum, data) => sum + data.keystrokes, 0);
    const totalMouseClicks = activityData.reduce((sum, data) => sum + data.mouseClicks, 0);
    const totalMouseMoves = activityData.reduce((sum, data) => sum + data.mouseMoves, 0);
    const totalScrolls = activityData.reduce((sum, data) => sum + data.scrolls, 0);
    const averageActivity = activityData.reduce((sum, data) => sum + data.activity, 0) / activityData.length;
    const idleIntervals = activityData.filter(data => data.isIdle).length;
    const activeIntervals = activityData.length - idleIntervals;
    const peakActivity = Math.max(...activityData.map(data => data.activity));
    const lowActivity = Math.min(...activityData.map(data => data.activity));

    // Activity distribution
    const highActivity = activityData.filter(data => data.activity >= 70).length;
    const mediumActivity = activityData.filter(data => data.activity >= 40 && data.activity < 70).length;
    const lowActivityCount = activityData.filter(data => data.activity < 40 && !data.isIdle).length;
    const idle = idleIntervals;

    const activityDistribution = [
      { name: 'High Activity', value: highActivity, color: ACTIVITY_COLORS.high },
      { name: 'Medium Activity', value: mediumActivity, color: ACTIVITY_COLORS.medium },
      { name: 'Low Activity', value: lowActivityCount, color: ACTIVITY_COLORS.low },
      { name: 'Idle', value: idle, color: ACTIVITY_COLORS.idle }
    ];

    return {
      averageActivity: Math.round(averageActivity),
      totalKeystrokes,
      totalMouseClicks,
      totalMouseMoves,
      totalScrolls,
      idleTime: idleIntervals * 10, // Convert to minutes (assuming 10-minute intervals)
      activeTime: activeIntervals * 10,
      peakActivity,
      lowActivity,
      activityDistribution
    };
  };

  const stats = calculateStats();

  // Get application usage data
  const getApplicationUsage = () => {
    const appUsage: Record<string, number> = {};
    
    activityData.forEach(data => {
      if (data.application) {
        appUsage[data.application] = (appUsage[data.application] || 0) + 1;
      }
    });

    return Object.entries(appUsage)
      .map(([name, intervals]) => ({ name, intervals, percentage: (intervals / activityData.length) * 100 }))
      .sort((a, b) => b.intervals - a.intervals)
      .slice(0, 5);
  };

  const applicationUsage = getApplicationUsage();

  const getActivityColor = (activity: number, isIdle: boolean) => {
    if (isIdle) return ACTIVITY_COLORS.idle;
    if (activity >= 70) return ACTIVITY_COLORS.high;
    if (activity >= 40) return ACTIVITY_COLORS.medium;
    return ACTIVITY_COLORS.low;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {item.value}
              {item.dataKey === 'activity' && '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (activityData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Activity Data
            </h3>
            <p className="text-gray-600">
              Activity data will appear here as you continue working during your session.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Activity Analysis</h2>
        <p className="text-gray-600">Detailed breakdown of your productivity and activity patterns</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-lg font-bold">{stats.averageActivity}%</div>
                <div className="text-xs text-gray-600">Avg Activity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-lg font-bold">{stats.totalKeystrokes.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Keystrokes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mouse className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-lg font-bold">{stats.totalMouseClicks.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Mouse Clicks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-lg font-bold">{stats.activeTime}m</div>
                <div className="text-xs text-gray-600">Active Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-lg font-bold">{stats.peakActivity}%</div>
                <div className="text-xs text-gray-600">Peak Activity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-lg font-bold">{stats.idleTime}m</div>
                <div className="text-xs text-gray-600">Idle Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Activity Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="metrics">Input Metrics</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Activity Level Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Activity %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="activity" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.activityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value, percent }) => {
                          const pct = typeof percent === 'number' ? percent : 0;
                          return `${name}: ${value} (${(pct * 100).toFixed(1)}%)`;
                        }}
                      >
                        {stats.activityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.activityDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{item.value}</div>
                        <div className="text-xs text-gray-500">
                          {((item.value / activityData.length) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Input Activity Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="keystrokes" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Keystrokes"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mouseClicks" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Mouse Clicks"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mouseMoves" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Mouse Moves"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="scrolls" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Scrolls"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Application Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {applicationUsage.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No application data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applicationUsage.map((app, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="font-medium">{app.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{app.intervals} intervals</div>
                        <div className="text-xs text-gray-500">{app.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};