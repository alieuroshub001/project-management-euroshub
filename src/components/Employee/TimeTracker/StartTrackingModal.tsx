// components/Employee/TimeTracker/StartTrackingModal.tsx
'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Play, X } from 'lucide-react';

interface StartTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (title: string, projectId?: string) => Promise<void>;
}

// Mock projects data - replace with actual data from your API
const mockProjects = [
  { id: '1', name: 'Website Redesign', description: 'Company website redesign project' },
  { id: '2', name: 'Mobile App', description: 'iOS and Android mobile application' },
  { id: '3', name: 'API Development', description: 'Backend API development' },
  { id: '4', name: 'Database Optimization', description: 'Database performance improvements' },
];

export const StartTrackingModal: React.FC<StartTrackingModalProps> = ({
  isOpen,
  onClose,
  onStart
}) => {
  const [formData, setFormData] = useState({
    title: '',
    projectId: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Session title is required';
    }
    
    if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await onStart(
        formData.title.trim(),
        formData.projectId || undefined
      );
      
      // Reset form and close modal
      setFormData({ title: '', projectId: '', description: '' });
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to start tracking session' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ title: '', projectId: '', description: '' });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Start New Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Session Title *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Frontend Development, Bug Fixes, Meeting..."
              className={errors.title ? 'border-red-500' : ''}
              disabled={loading}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <Select
              value={formData.projectId}
              onValueChange={(value: string) => handleInputChange('projectId', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Project</SelectItem>
                {mockProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-gray-500">
                        {project.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of what you'll be working on..."
              className="min-h-[80px]"
              disabled={loading}
              maxLength={500}
            />
            <div className="text-xs text-gray-500">
              {formData.description.length}/500 characters
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Session Settings Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Session Settings
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Screenshots will be taken automatically every 10 minutes</li>
              <li>• Activity tracking will monitor your productivity</li>
              <li>• You can pause/resume the session at any time</li>
              <li>• Add tasks manually during or after the session</li>
            </ul>
          </div>
        </form>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Tracking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};