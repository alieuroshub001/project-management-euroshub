// components/Employee/TimeTracker/TimeTrackerDashboard.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Camera, 
  CheckSquare,
  Activity,
  Settings,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useTimeTracker } from './TimeTrackerContext';
import { StartTrackingModal } from './StartTrackingModal';
import { TaskManager } from './TaskManager';
import { ScreenshotGallery } from './ScreenshotGallery';
import { SessionSummary } from './SessionSummary';
import { ActivityChart } from './ActivityChart';
import { formatTime } from '@/utils/timetracker';

export const TimeTrackerDashboard: React.FC = () => {
  const {
    currentSession,
    isTracking,
    isPaused,
    elapsedTime,
    settings,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    loading,
    error
  } = useTimeTracker();

  const [showStartModal, setShowStartModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'stopped': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Active';
      case 'paused': return 'Paused';
      case 'stopped': return 'Stopped';
      default: return 'Inactive';
    }
  };

  const handleStartTracking = () => {
    setShowStartModal(true);
  };

  const handleStopTracking = async () => {
    if (window.confirm('Are you sure you want to stop this session? This action cannot be undone.')) {
      await stopTracking();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Tracker</h1>
          <p className="text-gray-600 mt-1">Track your work sessions and productivity</p>
        </div>
        
        <div className="flex items-center gap-4">
          {currentSession && (
            <Badge 
              variant="secondary" 
              className={`${getStatusColor(currentSession.status)} text-white`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {getStatusText(currentSession.status)}
              </div>
            </Badge>
          )}
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentSession ? (
            <div className="space-y-4">
              {/* Session Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{currentSession.title}</h3>
                  {currentSession.description && (
                    <p className="text-gray-600">{currentSession.description}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Started: {new Date(currentSession.startTime).toLocaleString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-blue-600">
                    {formatTime(elapsedTime)}
                  </div>
                  <p className="text-sm text-gray-500">Elapsed Time</p>
                </div>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentSession.screenshots?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Screenshots</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentSession.tasksCompleted?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Tasks</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentSession.averageActivityLevel || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Activity</div>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentSession.totalKeystrokes || 0}
                  </div>
                  <div className="text-sm text-gray-600">Keystrokes</div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3">
                {isTracking ? (
                  <Button 
                    variant="outline"
                    onClick={pauseTracking}
                    disabled={loading}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : isPaused ? (
                  <Button 
                    onClick={resumeTracking}
                    disabled={loading}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : null}
                
                <Button 
                  variant="destructive"
                  onClick={handleStopTracking}
                  disabled={loading}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Active Session
              </h3>
              <p className="text-gray-600 mb-4">
                Start tracking your time to monitor productivity
              </p>
              <Button onClick={handleStartTracking} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                Start Tracking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Section */}
      {currentSession && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Productivity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {currentSession.averageActivityLevel || 0}%
                  </div>
                  <p className="text-sm text-gray-600">Average Activity Level</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Screenshots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {currentSession.screenshots?.length || 0}
                  </div>
                  <p className="text-sm text-gray-600">Captured Screenshots</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {currentSession.tasksCompleted?.length || 0}
                  </div>
                  <p className="text-sm text-gray-600">Completed Tasks</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <TaskManager session={currentSession} />
          </TabsContent>

          <TabsContent value="screenshots">
            <ScreenshotGallery session={currentSession} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityChart session={currentSession} />
          </TabsContent>

          <TabsContent value="summary">
            <SessionSummary session={currentSession} />
          </TabsContent>
        </Tabs>
      )}

      {/* Start Tracking Modal */}
      <StartTrackingModal 
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        onStart={startTracking}
      />

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};