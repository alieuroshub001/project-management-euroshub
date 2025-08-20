// components/Employee/TimeTracker/SessionSummary.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Calendar, 
  CheckSquare, 
  Camera, 
  Activity, 
  Keyboard, 
  Mouse, 
  Download,
  FileText,
  TrendingUp,
  Target,
  Award,
  DollarSign,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { ITimeTrackerSession } from '@/types';
import { formatDuration, formatCurrency } from '@/utils/timetracker';

interface SessionSummaryProps {
  session: ITimeTrackerSession;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ session }) => {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(session.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Calculate session metrics
  const calculateMetrics = () => {
    const startTime = new Date(session.startTime);
    const endTime = session.endTime ? new Date(session.endTime) : new Date();
    const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    const totalHours = totalMinutes / 60;
    const pausedMinutes = session.pausedTime || 0;
    const activeMinutes = Math.max(0, totalMinutes - pausedMinutes);
    const activeHours = activeMinutes / 60;

    const screenshots = session.screenshots || [];
    const tasks = session.tasksCompleted || [];
    const activityLevels = session.activityLevels || [];

    // Calculate productive vs idle time
    const productiveMinutes = activityLevels.reduce((total, activity) => {
      return total + (activity.isIdle ? 0 : activity.intervalMinutes);
    }, 0);
    const idleMinutes = activeMinutes - productiveMinutes;

    // Calculate earnings
    const earnings = session.hourlyRate ? (activeHours * session.hourlyRate) : 0;

    // Activity breakdown
    const highActivityCount = screenshots.filter(s => s.activityLevel >= 70).length;
    const mediumActivityCount = screenshots.filter(s => s.activityLevel >= 40 && s.activityLevel < 70).length;
    const lowActivityCount = screenshots.filter(s => s.activityLevel < 40).length;

    // Task breakdown by category
    const tasksByCategory = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMinutes,
      totalHours,
      activeMinutes,
      activeHours,
      pausedMinutes,
      productiveMinutes,
      idleMinutes,
      screenshots: screenshots.length,
      tasks: tasks.length,
      earnings,
      averageActivity: session.averageActivityLevel || 0,
      totalKeystrokes: session.totalKeystrokes || 0,
      totalMouseClicks: session.totalMouseClicks || 0,
      activityBreakdown: {
        high: highActivityCount,
        medium: mediumActivityCount,
        low: lowActivityCount
      },
      tasksByCategory
    };
  };

  const metrics = calculateMetrics();

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      // Here you would call the API to update notes
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEditingNotes(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setNotes(session.notes || '');
    setEditingNotes(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'stopped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Active';
      case 'paused': return 'Paused';
      case 'stopped': return 'Completed';
      default: return 'Unknown';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const generateReport = () => {
    const reportData = {
      session: {
        title: session.title,
        description: session.description,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status
      },
      metrics,
      tasks: session.tasksCompleted,
      notes: session.notes
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-report-${new Date(session.startTime).toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              {session.description && (
                <p className="text-gray-600 mt-1">{session.description}</p>
              )}
            </div>
            <Badge className={getStatusColor(session.status)}>
              {getStatusText(session.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Started: {new Date(session.startTime).toLocaleString()}</span>
            </div>
            {session.endTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Ended: {new Date(session.endTime).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span>Last Active: {new Date(session.lastActive).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-xl font-bold">{formatTime(metrics.activeMinutes)}</div>
                <div className="text-xs text-gray-600">Active Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-xl font-bold">{formatTime(metrics.productiveMinutes)}</div>
                <div className="text-xs text-gray-600">Productive</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-xl font-bold">{metrics.screenshots}</div>
                <div className="text-xs text-gray-600">Screenshots</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-xl font-bold">{metrics.tasks}</div>
                <div className="text-xs text-gray-600">Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              <div>
                <div className="text-xl font-bold">{metrics.averageActivity}%</div>
                <div className="text-xs text-gray-600">Avg Activity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {session.hourlyRate && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-xl font-bold">${metrics.earnings.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">Earnings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Time Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Session Time</span>
                <span className="font-medium">{formatTime(metrics.totalMinutes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Time</span>
                <span className="font-medium text-green-600">{formatTime(metrics.activeMinutes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Productive Time</span>
                <span className="font-medium text-blue-600">{formatTime(metrics.productiveMinutes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Idle Time</span>
                <span className="font-medium text-gray-500">{formatTime(metrics.idleMinutes)}</span>
              </div>
              {metrics.pausedMinutes > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Paused Time</span>
                  <span className="font-medium text-yellow-600">{formatTime(metrics.pausedMinutes)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">High Activity (70%+)</span>
                </div>
                <span className="font-medium">{metrics.activityBreakdown.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">Medium Activity (40-69%)</span>
                </div>
                <span className="font-medium">{metrics.activityBreakdown.medium}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
<span className="text-gray-600">Low Activity (&lt;40%)</span>
                </div>
                <span className="font-medium">{metrics.activityBreakdown.low}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">Total Keystrokes</span>
                </div>
                <span className="font-medium">{metrics.totalKeystrokes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Mouse className="h-4 w-4 text-purple-500" />
                  <span className="text-gray-600">Mouse Clicks</span>
                </div>
                <span className="font-medium">{metrics.totalMouseClicks.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Summary */}
      {session.tasksCompleted && session.tasksCompleted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tasks Completed ({session.tasksCompleted.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {session.tasksCompleted.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{task.task}</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.hoursSpent && task.hoursSpent > 0 && (
                      <span>{task.hoursSpent}h spent</span>
                    )}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-1">
                        {task.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Notes */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Session Notes</CardTitle>
            {!editingNotes && (
              <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Notes
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this session..."
                className="min-h-[100px]"
                maxLength={2000}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{notes.length}/2000 characters</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingNotes ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[100px] p-4 bg-gray-50 rounded-lg">
              {session.notes ? (
                <p className="text-gray-700 whitespace-pre-wrap">{session.notes}</p>
              ) : (
                <p className="text-gray-500 italic">No notes added for this session</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </div>

        {session.hourlyRate && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">
              ${metrics.earnings.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};