// components/Employee/TimeTracker/ScreenshotGallery.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Camera, 
  Search, 
  Filter, 
  Calendar, 
  Activity, 
  Mouse, 
  Keyboard,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { ITimeTrackerSession, IScreenshot } from '@/types';

interface ScreenshotGalleryProps {
  session: ITimeTrackerSession;
}

interface FilterState {
  timeRange: 'all' | 'last-hour' | 'last-2hours' | 'last-4hours';
  activityLevel: 'all' | 'low' | 'medium' | 'high';
}

export const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ session }) => {
  const [selectedScreenshot, setSelectedScreenshot] = useState<IScreenshot | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    timeRange: 'all',
    activityLevel: 'all'
  });
  const [showBlurred, setShowBlurred] = useState(false);

  const screenshots = session.screenshots || [];

  // Filter screenshots based on search and filters
  const filteredScreenshots = screenshots.filter(screenshot => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesWindow = screenshot.activeWindowTitle?.toLowerCase().includes(searchLower);
      const matchesApp = screenshot.activeApplicationName?.toLowerCase().includes(searchLower);
      const matchesDescription = screenshot.description?.toLowerCase().includes(searchLower);
      
      if (!matchesWindow && !matchesApp && !matchesDescription) {
        return false;
      }
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const screenshotTime = new Date(screenshot.timestamp);
      const hoursAgo = {
        'last-hour': 1,
        'last-2hours': 2,
        'last-4hours': 4
      }[filters.timeRange] || 0;
      
      const cutoff = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
      if (screenshotTime < cutoff) {
        return false;
      }
    }

    // Activity level filter
    if (filters.activityLevel !== 'all') {
      const level = screenshot.activityLevel;
      const range = {
        'low': [0, 33],
        'medium': [34, 66],
        'high': [67, 100]
      }[filters.activityLevel] || [0, 100];
      
      if (level < range[0] || level > range[1]) {
        return false;
      }
    }

    return true;
  });

  const getActivityLevelColor = (level: number) => {
    if (level >= 70) return 'bg-green-100 text-green-800';
    if (level >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getActivityLevelText = (level: number) => {
    if (level >= 70) return 'High';
    if (level >= 40) return 'Medium';
    return 'Low';
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleScreenshotClick = (screenshot: IScreenshot, index: number) => {
    setSelectedScreenshot(screenshot);
    setCurrentIndex(index);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setSelectedScreenshot(filteredScreenshots[newIndex]);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredScreenshots.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedScreenshot(filteredScreenshots[newIndex]);
    }
  };

  const handleDownload = (screenshot: IScreenshot) => {
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = `screenshot-${new Date(screenshot.timestamp).getTime()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Screenshots</h2>
          <p className="text-gray-600">
            {screenshots.length} screenshots captured • {filteredScreenshots.length} shown
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={showBlurred ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBlurred(!showBlurred)}
          >
            {showBlurred ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showBlurred ? 'Hide Blurred' : 'Show Blurred'}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by window title, application, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Time Range Filter */}
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="last-hour">Last Hour</option>
              <option value="last-2hours">Last 2 Hours</option>
              <option value="last-4hours">Last 4 Hours</option>
            </select>

            {/* Activity Level Filter */}
            <select
              value={filters.activityLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, activityLevel: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activity</option>
              <option value="low">Low Activity</option>
              <option value="medium">Medium Activity</option>
              <option value="high">High Activity</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Grid */}
      {filteredScreenshots.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {screenshots.length === 0 ? 'No screenshots captured yet' : 'No screenshots match your filters'}
              </h3>
              <p className="text-gray-600">
                {screenshots.length === 0 
                  ? 'Screenshots will be captured automatically during your tracking session'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScreenshots.map((screenshot, index) => (
            <Card 
              key={screenshot.public_id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleScreenshotClick(screenshot, index)}
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={showBlurred && screenshot.isBlurred ? screenshot.blurredUrl || screenshot.url : screenshot.thumbnailUrl || screenshot.url}
                  alt={`Screenshot at ${formatTime(screenshot.timestamp)}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay with time */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatTime(screenshot.timestamp)}
                </div>

                {/* Activity level badge */}
                <div className="absolute top-2 right-2">
                  <Badge className={getActivityLevelColor(screenshot.activityLevel)}>
                    {screenshot.activityLevel}%
                  </Badge>
                </div>

                {/* Manual capture indicator */}
                {screenshot.isManualCapture && (
                  <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Manual
                  </div>
                )}

                {/* Zoom overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>

              <CardContent className="p-3">
                <div className="space-y-2">
                  {/* Window/App info */}
                  <div className="text-sm">
                    {screenshot.activeWindowTitle && (
                      <p className="font-medium text-gray-900 truncate" title={screenshot.activeWindowTitle}>
                        {screenshot.activeWindowTitle}
                      </p>
                    )}
                    {screenshot.activeApplicationName && (
                      <p className="text-gray-600 text-xs truncate" title={screenshot.activeApplicationName}>
                        {screenshot.activeApplicationName}
                      </p>
                    )}
                  </div>

                  {/* Activity metrics */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Keyboard className="h-3 w-3" />
                      {screenshot.keystrokes}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mouse className="h-3 w-3" />
                      {screenshot.mouseClicks}
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {getActivityLevelText(screenshot.activityLevel)}
                    </div>
                  </div>

                  {/* Description */}
                  {screenshot.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {screenshot.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Screenshot Details</span>
              <div className="flex items-center gap-2">
                <Badge className={getActivityLevelColor(selectedScreenshot?.activityLevel || 0)}>
                  {selectedScreenshot?.activityLevel}% Activity
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedScreenshot && handleDownload(selectedScreenshot)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedScreenshot && (
            <div className="p-6">
              {/* Image */}
              <div className="relative mb-6 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={showBlurred && selectedScreenshot.isBlurred ? selectedScreenshot.blurredUrl || selectedScreenshot.url : selectedScreenshot.url}
                  alt={`Screenshot at ${formatTime(selectedScreenshot.timestamp)}`}
                  className="w-full max-h-96 object-contain"
                />

                {/* Navigation buttons */}
                {filteredScreenshots.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={handleNext}
                      disabled={currentIndex === filteredScreenshots.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Image counter */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-sm px-3 py-1 rounded">
                  {currentIndex + 1} of {filteredScreenshots.length}
                </div>
              </div>

              {/* Screenshot metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Capture Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span>{new Date(selectedScreenshot.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interval:</span>
                      <span>
                        {formatTime(selectedScreenshot.intervalStart)} - {formatTime(selectedScreenshot.intervalEnd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capture Type:</span>
                      <span>{selectedScreenshot.isManualCapture ? 'Manual' : 'Automatic'}</span>
                    </div>
                    {selectedScreenshot.width && selectedScreenshot.height && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resolution:</span>
                        <span>{selectedScreenshot.width} × {selectedScreenshot.height}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Activity Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Activity Level:</span>
                      <Badge className={getActivityLevelColor(selectedScreenshot.activityLevel)}>
                        {selectedScreenshot.activityLevel}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Keystrokes:</span>
                      <span>{selectedScreenshot.keystrokes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mouse Clicks:</span>
                      <span>{selectedScreenshot.mouseClicks}</span>
                    </div>
                    {selectedScreenshot.activeWindowTitle && (
                      <div>
                        <span className="text-gray-600 block mb-1">Active Window:</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedScreenshot.activeWindowTitle}
                        </span>
                      </div>
                    )}
                    {selectedScreenshot.activeApplicationName && (
                      <div>
                        <span className="text-gray-600 block mb-1">Application:</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedScreenshot.activeApplicationName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedScreenshot.description && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedScreenshot.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};