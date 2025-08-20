// components/Employee/TimeTracker/TimeTrackerContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { 
  ITimeTrackerSession, 
  ITimeTrackerSettings, 
  ITaskCompleted, 
  IActivityData,
  ITimeTrackerContextValue,
  TimeTrackerStatus 
} from '@/types';
import { combineAppliedNumericalValuesIncludingErrorValues } from 'recharts/types/state/selectors/axisSelectors';

const TimeTrackerContext = createContext<ITimeTrackerContextValue | undefined>(undefined);

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};

interface TimeTrackerProviderProps {
  children: React.ReactNode;
}

export const TimeTrackerProvider: React.FC<TimeTrackerProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [currentSession, setCurrentSession] = useState<ITimeTrackerSession | null>(null);
  const [settings, setSettings] = useState<ITimeTrackerSettings | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotInterval, setScreenshotInterval] = useState<NodeJS.Timeout | null>(null);
  const [activityInterval, setActivityInterval] = useState<NodeJS.Timeout | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Computed states
  const isTracking = currentSession?.status === 'running';
  const isPaused = currentSession?.status === 'paused';

  // Activity tracking variables
  const [activityData, setActivityData] = useState<{
    keystrokes: number;
    mouseClicks: number;
    mouseMoves: number;
    scrolls: number;
  }>({
    keystrokes: 0,
    mouseClicks: 0,
    mouseMoves: 0,
    scrolls: 0
  });

  // Fetch current active session on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchActiveSession();
      fetchSettings();
    }
  }, [session?.user?.id]);

  // Update elapsed time every second when tracking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTracking && currentSession) {
      interval = setInterval(() => {
        const startTime = new Date(currentSession.startTime).getTime();
        const now = Date.now();
        const pausedTimeMs = (currentSession.pausedTime || 0) * 60 * 1000;
        setElapsedTime(Math.floor((now - startTime - pausedTimeMs) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, currentSession]);

  // Setup activity tracking
  useEffect(() => {
    if (isTracking && settings?.activityTrackingEnabled) {
      setupActivityTracking();
    } else {
      cleanupActivityTracking();
    }

    return () => cleanupActivityTracking();
  }, [isTracking, settings?.activityTrackingEnabled]);

  // Setup screenshot capturing
  useEffect(() => {
    if (isTracking && settings?.screenshotsRequired && permissionGranted && screenStream) {
      setupScreenshotCapture();
    } else {
      cleanupScreenshotCapture();
    }

    return () => cleanupScreenshotCapture();
  }, [isTracking, settings?.screenshotsRequired, settings?.screenshotFrequency, permissionGranted, screenStream]);

  // Cleanup stream when tracking stops or pauses
  useEffect(() => {
    if (!isTracking) {
      cleanupScreenStream();
    }
  }, [isTracking]);

  const fetchActiveSession = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/employee/time-tracker/sessions?employeeId=${session.user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setCurrentSession(data.data);
      }
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchSettings = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/employee/time-tracker/settings?employeeId=${session.user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const setupActivityTracking = () => {
    const handleKeydown = () => {
      setActivityData(prev => ({ ...prev, keystrokes: prev.keystrokes + 1 }));
    };

    const handleClick = () => {
      setActivityData(prev => ({ ...prev, mouseClicks: prev.mouseClicks + 1 }));
    };

    const handleMouseMove = () => {
      setActivityData(prev => ({ ...prev, mouseMoves: prev.mouseMoves + 1 }));
    };

    const handleScroll = () => {
      setActivityData(prev => ({ ...prev, scrolls: prev.scrolls + 1 }));
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll);

    // Send activity data every 10 minutes
    const activityTimer = setInterval(() => {
      if (currentSession?.id) {
        sendActivityData();
      }
    }, 10 * 60 * 1000); // 10 minutes

    setActivityInterval(activityTimer);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
    };
  };

  const cleanupActivityTracking = () => {
    if (activityInterval) {
      clearInterval(activityInterval);
      setActivityInterval(null);
    }
  };

  const requestScreenPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      } as DisplayMediaStreamOptions);
      
      setScreenStream(stream);
      setPermissionGranted(true);
      
      // Handle when user stops sharing via browser controls
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen sharing ended by user');
        setScreenStream(null);
        setPermissionGranted(false);
        cleanupScreenshotCapture();
        toast.warning('Screen sharing stopped. Screenshots disabled.');
      });
      
      return true;
    } catch (error) {
      console.error('Screen permission denied:', error);
      setPermissionGranted(false);
      toast.error('Screen sharing permission required for screenshots');
      return false;
    }
  };

  const setupScreenshotCapture = () => {
    if (!currentSession?.id || !screenStream) return;

    // Default to 1 minute if settings value is missing or invalid
    const minutes = Math.max(1, Number(settings?.screenshotFrequency) || 1);
    const intervalMs = minutes * 60 * 1000;

    const interval = setInterval(() => {
      if (screenStream && screenStream.active) {
        captureScreenshot();
      } else {
        console.warn('Screen stream not active, skipping screenshot');
        cleanupScreenshotCapture();
      }
    }, intervalMs);

    setScreenshotInterval(interval);
  };

  const cleanupScreenshotCapture = () => {
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      setScreenshotInterval(null);
    }
  };

  const cleanupScreenStream = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setPermissionGranted(false);
    }
  };

  const sendActivityData = async () => {
    if (!currentSession?.id) return;

    const activity: IActivityData = {
      timestamp: new Date(),
      keystrokes: activityData.keystrokes,
      mouseClicks: activityData.mouseClicks,
      mouseMoves: activityData.mouseMoves,
      scrolls: activityData.scrolls,
      activeWindowTitle: document.title,
      activeApplicationName: 'Web Browser',
      isIdle: activityData.keystrokes === 0 && activityData.mouseClicks === 0
    };

    try {
      const response = await fetch(`/api/employee/time-tracker/sessions/${currentSession.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity })
      });

      if (response.ok) {
        // Reset activity counters
        setActivityData({
          keystrokes: 0,
          mouseClicks: 0,
          mouseMoves: 0,
          scrolls: 0
        });
      }
    } catch (error) {
      console.error('Error sending activity data:', error);
    }
  };

  const startTracking = async (title: string, projectId?: string) => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/employee/time-tracker/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: session.user.id,
          title,
          projectId,
          description: ''
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.data);
        
        // Request screen permission only once when starting
        if (settings?.screenshotsRequired) {
          const permissionGranted = await requestScreenPermission();
          if (permissionGranted) {
            toast.success('Time tracking started with screenshots enabled');
            // Take first screenshot immediately
            setTimeout(() => captureScreenshot(), 1000);
          } else {
            toast.success('Time tracking started (screenshots disabled - permission required)');
          }
        } else {
          toast.success('Time tracking started');
        }
      } else {
        setError(data.message);
        toast.error(data.message);
      }
    } catch (error) {
      setError('Failed to start tracking');
      toast.error('Failed to start tracking');
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    if (!currentSession?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/employee/time-tracker/sessions/${currentSession.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.data);
        toast.success('Time tracking stopped');
      } else {
        setError(data.message);
        toast.error(data.message);
      }
    } catch (error) {
      setError('Failed to stop tracking');
      toast.error('Failed to stop tracking');
    } finally {
      // Cleanup everything when stopping
      cleanupScreenStream();
      cleanupScreenshotCapture();
      setLoading(false);
    }
  };

  const pauseTracking = async () => {
    if (!currentSession?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/employee/time-tracker/sessions/${currentSession.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.data);
        toast.success('Time tracking paused');
      } else {
        setError(data.message);
        toast.error(data.message);
      }
    } catch (error) {
      setError('Failed to pause tracking');
      toast.error('Failed to pause tracking');
    } finally {
      // Don't cleanup stream on pause, just stop the interval
      cleanupScreenshotCapture();
      setLoading(false);
    }
  };

  const resumeTracking = async () => {
    if (!currentSession?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/employee/time-tracker/sessions/${currentSession.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.data);
        toast.success('Time tracking resumed');
      } else {
        setError(data.message);
        toast.error(data.message);
      }
    } catch (error) {
      setError('Failed to resume tracking');
      toast.error('Failed to resume tracking');
    } finally {
      // Screenshot capturing will resume via useEffect
      setLoading(false);
    }
  };

  const captureScreenshot = async () => {
    if (!currentSession?.id || !screenStream || !screenStream.active) {
      console.warn('Cannot capture screenshot: missing session, stream, or stream inactive');
      return;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.muted = true;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = reject;
        video.play();
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });

      if (!blob) {
        throw new Error('Failed to create screenshot blob');
      }

      const formData = new FormData();
      formData.append('file', blob, 'screenshot.png');
      
      const now = new Date();
      const minutes = Math.max(1, Number(settings?.screenshotFrequency) || 1);
      const intervalStart = new Date(now.getTime() - minutes * 60 * 1000);
      
      formData.append('activity', JSON.stringify({
        intervalStart,
        intervalEnd: now,
        activityLevel: calculateActivityLevel(),
        keystrokes: activityData.keystrokes,
        mouseClicks: activityData.mouseClicks,
        activeWindowTitle: document.title,
        activeApplicationName: 'Web Browser',
        isManualCapture: false
      }));

      const response = await fetch(`/api/employee/time-tracker/sessions/${currentSession.id}/screenshots`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data.data);
        console.log('Screenshot captured successfully');
      } else {
        console.error('Failed to upload screenshot');
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      
      // If stream is ended, cleanup and notify
      if (error instanceof Error && error.message.includes('stream')) {
        cleanupScreenStream();
        toast.error('Screen sharing interrupted. Please restart session for screenshots.');
      }
    }
  };

  const calculateActivityLevel = (): number => {
    const total = activityData.keystrokes + activityData.mouseClicks + activityData.mouseMoves;
    return Math.min(100, Math.max(0, total / 10)); // Simple calculation
  };

  const updateActivity = useCallback((activity: IActivityData) => {
    setActivityData(prev => ({
      keystrokes: prev.keystrokes + activity.keystrokes,
      mouseClicks: prev.mouseClicks + activity.mouseClicks,
      mouseMoves: prev.mouseMoves + activity.mouseMoves,
      scrolls: prev.scrolls + activity.scrolls
    }));
  }, []);

  const addTask = async (task: Omit<ITaskCompleted, 'id'>) => {
    if (!currentSession?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/employee/time-tracker/sessions/${currentSession.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentSession(data.data);
        toast.success('Task added successfully');
      } else {
        setError(data.message);
        toast.error(data.message);
      }
    } catch (error) {
      setError('Failed to add task');
      toast.error('Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const updateNotes = async (notes: string) => {
    if (!currentSession?.id) return;

    try {
      // This would require a separate API endpoint for updating notes
      // For now, we'll just update the local state
      setCurrentSession(prev => prev ? { ...prev, notes } : null);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const contextValue: ITimeTrackerContextValue = {
    currentSession,
    isTracking,
    isPaused,
    elapsedTime,
    settings,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    captureScreenshot,
    updateActivity,
    addTask,
    updateNotes,
    loading,
    error
  };

  return (
    <TimeTrackerContext.Provider value={contextValue}>
      {children}
    </TimeTrackerContext.Provider>
  );
};

