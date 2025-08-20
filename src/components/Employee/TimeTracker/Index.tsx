// components/Employee/TimeTracker/index.tsx - Main export file
'use client';

import React from 'react';
import { TimeTrackerProvider } from './TimeTrackerContext';
import { TimeTrackerDashboard } from './TimeTrackerDashboard';

export interface TimeTrackerProps {
  className?: string;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ className }) => {
  return (
    <div className={className}>
      <TimeTrackerProvider>
        <TimeTrackerDashboard />
      </TimeTrackerProvider>
    </div>
  );
};

// Named exports for individual components
export { TimeTrackerProvider } from './TimeTrackerContext';
export { TimeTrackerDashboard } from './TimeTrackerDashboard';
export { StartTrackingModal } from './StartTrackingModal';
export { TaskManager } from './TaskManager';
export { ScreenshotGallery } from './ScreenshotGallery';
export { ActivityChart } from './ActivityChart';
export { SessionSummary } from './SessionSummary';
export { useTimeTracker } from './TimeTrackerContext';

// Default export
export default TimeTracker;