// utils/timetracker.ts - Utility functions for time tracker

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time utilities
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Date utilities
export const isToday = (date: Date | string): boolean => {
  const targetDate = new Date(date);
  const today = new Date();
  
  return targetDate.toDateString() === today.toDateString();
};

export const isYesterday = (date: Date | string): boolean => {
  const targetDate = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return targetDate.toDateString() === yesterday.toDateString();
};

export const formatRelativeTime = (date: Date | string): string => {
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  return new Date(date).toLocaleDateString();
};

// Activity level utilities
export const getActivityLevelColor = (level: number): string => {
  if (level >= 70) return 'text-green-600 bg-green-100';
  if (level >= 40) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export const getActivityLevelText = (level: number): string => {
  if (level >= 70) return 'High';
  if (level >= 40) return 'Medium';
  return 'Low';
};

export const calculateProductivityScore = (
  keystrokes: number,
  mouseClicks: number,
  mouseMoves: number,
  intervalMinutes: number = 10
): number => {
  // Simple productivity calculation based on input activity
  const totalInputs = keystrokes + mouseClicks + (mouseMoves / 10);
  const inputsPerMinute = totalInputs / intervalMinutes;
  
  // Scale to 0-100, with diminishing returns for very high activity
  let score = Math.min(100, inputsPerMinute * 5);
  
  // Apply diminishing returns curve
  if (score > 80) {
    score = 80 + (score - 80) * 0.5;
  }
  
  return Math.round(Math.max(0, score));
};

// Screenshot utilities
export const getScreenshotDisplayUrl = (
  screenshot: { url: string; thumbnailUrl?: string; blurredUrl?: string; isBlurred?: boolean },
  showBlurred: boolean = false,
  useThumbnail: boolean = false
): string => {
  if (showBlurred && screenshot.isBlurred && screenshot.blurredUrl) {
    return screenshot.blurredUrl;
  }
  
  if (useThumbnail && screenshot.thumbnailUrl) {
    return screenshot.thumbnailUrl;
  }
  
  return screenshot.url;
};

// Session utilities
export const calculateSessionDuration = (
  startTime: Date | string,
  endTime?: Date | string | null,
  pausedMinutes: number = 0
): { totalMinutes: number; activeMinutes: number; totalHours: number; activeHours: number } => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  const activeMinutes = Math.max(0, totalMinutes - pausedMinutes);
  
  return {
    totalMinutes,
    activeMinutes,
    totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
    activeHours: parseFloat((activeMinutes / 60).toFixed(2))
  };
};

export const getSessionStatusColor = (status: string): string => {
  switch (status) {
    case 'running': return 'bg-green-100 text-green-800 border-green-200';
    case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'stopped': return 'bg-red-100 text-red-800 border-red-200';
    case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getSessionStatusText = (status: string): string => {
  switch (status) {
    case 'running': return 'Active';
    case 'paused': return 'Paused';
    case 'stopped': return 'Completed';
    case 'archived': return 'Archived';
    default: return 'Unknown';
  }
};

// Task utilities
export const getTaskCategoryColor = (category: string): string => {
  switch (category) {
    case 'development': return 'bg-blue-100 text-blue-800';
    case 'design': return 'bg-purple-100 text-purple-800';
    case 'testing': return 'bg-green-100 text-green-800';
    case 'meeting': return 'bg-yellow-100 text-yellow-800';
    case 'documentation': return 'bg-gray-100 text-gray-800';
    case 'research': return 'bg-indigo-100 text-indigo-800';
    case 'other': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getTaskPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'low': return 'bg-gray-100 text-gray-800';
    case 'medium': return 'bg-blue-100 text-blue-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'urgent': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Data export utilities
export const exportSessionData = (
  session: any,
  format: 'json' | 'csv' = 'json'
): void => {
  const filename = `session-${session.title.replace(/[^a-z0-9]/gi, '_')}-${new Date(session.startTime).toISOString().split('T')[0]}`;
  
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    downloadFile(blob, `${filename}.json`);
  } else if (format === 'csv') {
    const csvData = convertSessionToCSV(session);
    const blob = new Blob([csvData], { type: 'text/csv' });
    downloadFile(blob, `${filename}.csv`);
  }
};

const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const convertSessionToCSV = (session: any): string => {
  const headers = ['Type', 'Time', 'Description', 'Value'];
  const rows: string[][] = [headers];
  
  // Add session info
  rows.push(['Session', session.startTime, session.title, session.status]);
  
  // Add tasks
  session.tasksCompleted?.forEach((task: any) => {
    rows.push(['Task', '', task.task, `${task.category} - ${task.priority}`]);
  });
  
  // Add screenshots
  session.screenshots?.forEach((screenshot: any) => {
    rows.push(['Screenshot', screenshot.timestamp, screenshot.activeWindowTitle || '', `${screenshot.activityLevel}%`]);
  });
  
  // Add activity levels
  session.activityLevels?.forEach((activity: any) => {
    rows.push(['Activity', activity.timestamp, activity.activeApplicationName || '', `${activity.productivityScore}%`]);
  });
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
};

// Validation utilities
export const validateSessionTitle = (title: string): { isValid: boolean; error?: string } => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Session title is required' };
  }
  
  if (title.trim().length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters long' };
  }
  
  if (title.length > 100) {
    return { isValid: false, error: 'Title cannot exceed 100 characters' };
  }
  
  return { isValid: true };
};

export const validateTaskData = (task: {
  task: string;
  hoursSpent?: number;
  category: string;
  priority: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!task.task || task.task.trim().length === 0) {
    errors.task = 'Task description is required';
  } else if (task.task.length > 200) {
    errors.task = 'Task description cannot exceed 200 characters';
  }
  
  if (task.hoursSpent !== undefined) {
    if (task.hoursSpent < 0) {
      errors.hoursSpent = 'Hours spent cannot be negative';
    } else if (task.hoursSpent > 24) {
      errors.hoursSpent = 'Hours spent cannot exceed 24';
    }
  }
  
  const validCategories = ['development', 'design', 'testing', 'meeting', 'documentation', 'research', 'other'];
  if (!validCategories.includes(task.category)) {
    errors.category = 'Invalid task category';
  }
  
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (!validPriorities.includes(task.priority)) {
    errors.priority = 'Invalid task priority';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Screen capture utilities
export const requestScreenCapture = async (): Promise<MediaStream | null> => {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: 'screen',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
  } catch (error) {
    console.error('Failed to capture screen:', error);
    return null;
  }
};

export const captureScreenshot = (stream: MediaStream): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    video.addEventListener('loadedmetadata', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        stream.getTracks().forEach(track => track.stop());
        resolve(blob);
      }, 'image/png', 0.8);
    });

    video.addEventListener('error', () => {
      stream.getTracks().forEach(track => track.stop());
      resolve(null);
    });
  });
};

// Activity tracking utilities
export const setupActivityListeners = (
  onActivity: (data: {
    keystrokes: number;
    mouseClicks: number;
    mouseMoves: number;
    scrolls: number;
  }) => void
) => {
  let activityData = {
    keystrokes: 0,
    mouseClicks: 0,
    mouseMoves: 0,
    scrolls: 0
  };

  const handleKeydown = () => {
    activityData.keystrokes++;
  };

  const handleClick = () => {
    activityData.mouseClicks++;
  };

  const handleMouseMove = () => {
    activityData.mouseMoves++;
  };

  const handleScroll = () => {
    activityData.scrolls++;
  };

  // Add event listeners
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClick);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('scroll', handleScroll);

  // Send activity data every 10 minutes
  const interval = setInterval(() => {
    onActivity({ ...activityData });
    activityData = { keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0 };
  }, 10 * 60 * 1000);

  // Cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleClick);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('scroll', handleScroll);
    clearInterval(interval);
  };
};

// Idle detection utilities
export const setupIdleDetection = (
  thresholdMinutes: number = 5,
  onIdleChange: (isIdle: boolean) => void
) => {
  let lastActivity = Date.now();
  let idleTimer: NodeJS.Timeout | null = null;
  let isCurrentlyIdle = false;

  const resetIdleTimer = () => {
    lastActivity = Date.now();
    
    if (isCurrentlyIdle) {
      isCurrentlyIdle = false;
      onIdleChange(false);
    }

    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(() => {
      isCurrentlyIdle = true;
      onIdleChange(true);
    }, thresholdMinutes * 60 * 1000);
  };

  // Activity events that reset idle timer
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, resetIdleTimer, true);
  });

  // Initialize timer
  resetIdleTimer();

  // Cleanup function
  return () => {
    events.forEach(event => {
      document.removeEventListener(event, resetIdleTimer, true);
    });
    
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
  };
};

// Local storage utilities for offline support
export const saveSessionToLocal = (session: any): void => {
  try {
    const sessions = getLocalSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem('timetracker_sessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save session to local storage:', error);
  }
};

export const getLocalSessions = (): any[] => {
  try {
    const sessions = localStorage.getItem('timetracker_sessions');
    return sessions ? JSON.parse(sessions) : [];
  } catch (error) {
    console.error('Failed to get sessions from local storage:', error);
    return [];
  }
};

export const removeLocalSession = (sessionId: string): void => {
  try {
    const sessions = getLocalSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem('timetracker_sessions', JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove session from local storage:', error);
  }
};

// Notification utilities
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
};

export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
};

// Time zone utilities
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const convertToTimezone = (date: Date, timezone: string): Date => {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
};

// Performance utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Statistics utilities
export const calculateSessionStats = (sessions: any[]) => {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalHours: 0,
      averageHours: 0,
      totalEarnings: 0,
      averageActivity: 0,
      totalScreenshots: 0,
      totalTasks: 0
    };
  }

  const totalSessions = sessions.length;
  const totalHours = sessions.reduce((sum, session) => sum + (session.totalHours || 0), 0);
  const averageHours = totalHours / totalSessions;
  const totalEarnings = sessions.reduce((sum, session) => sum + (session.totalEarnings || 0), 0);
  const averageActivity = sessions.reduce((sum, session) => sum + (session.averageActivityLevel || 0), 0) / totalSessions;
  const totalScreenshots = sessions.reduce((sum, session) => sum + (session.screenshots?.length || 0), 0);
  const totalTasks = sessions.reduce((sum, session) => sum + (session.tasksCompleted?.length || 0), 0);

  return {
    totalSessions,
    totalHours: parseFloat(totalHours.toFixed(2)),
    averageHours: parseFloat(averageHours.toFixed(2)),
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    averageActivity: Math.round(averageActivity),
    totalScreenshots,
    totalTasks
  };
};