// components/Employee/TimeTracker/TaskManager.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Plus, 
  CheckSquare, 
  Clock, 
  Tag, 
  AlertCircle, 
  Edit3,
  Trash2
} from 'lucide-react';
import { ITimeTrackerSession, ITaskCompleted, TaskCategory, TaskPriority } from '@/types';
import { useTimeTracker } from './TimeTrackerContext';

interface TaskManagerProps {
  session: ITimeTrackerSession;
}

interface TaskForm {
  task: string;
  description: string;
  hoursSpent: number;
  category: TaskCategory;
  priority: TaskPriority;
  tags: string[];
}

const taskCategories: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'development', label: 'Development', color: 'bg-blue-100 text-blue-800' },
  { value: 'design', label: 'Design', color: 'bg-purple-100 text-purple-800' },
  { value: 'testing', label: 'Testing', color: 'bg-green-100 text-green-800' },
  { value: 'meeting', label: 'Meeting', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'documentation', label: 'Documentation', color: 'bg-gray-100 text-gray-800' },
  { value: 'research', label: 'Research', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Other', color: 'bg-orange-100 text-orange-800' }
];

const taskPriorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

export const TaskManager: React.FC<TaskManagerProps> = ({ session }) => {
  const { addTask, loading } = useTimeTracker();
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    task: '',
    description: '',
    hoursSpent: 0,
    category: 'other',
    priority: 'medium',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tasks = session.tasksCompleted || [];

  const getCategoryInfo = (category: TaskCategory | undefined) => {
    const key = category ?? 'other';
    return taskCategories.find(c => c.value === key) || taskCategories[6];
  };

  const getPriorityInfo = (priority: TaskPriority | undefined) => {
    const key = priority ?? 'medium';
    return taskPriorities.find(p => p.value === key) || taskPriorities[1];
  };

  const handleAddTask = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!taskForm.task.trim()) {
      newErrors.task = 'Task description is required';
    }
    
    if (taskForm.hoursSpent < 0) {
      newErrors.hoursSpent = 'Hours spent cannot be negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await addTask({
        task: taskForm.task.trim(),
        description: taskForm.description.trim(),
        hoursSpent: taskForm.hoursSpent,
        category: taskForm.category,
        priority: taskForm.priority,
        tags: taskForm.tags
      });

      // Reset form and close modal
      setTaskForm({
        task: '',
        description: '',
        hoursSpent: 0,
        category: 'other',
        priority: 'medium',
        tags: []
      });
      setTagInput('');
      setErrors({});
      setShowAddModal(false);
    } catch (error) {
      setErrors({ submit: 'Failed to add task' });
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !taskForm.tags.includes(tag)) {
      setTaskForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTaskForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const calculateTotalHours = () => {
    return tasks.reduce((total, task) => total + (task.hoursSpent || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Task Management</h2>
          <p className="text-gray-600">
            Track and manage tasks completed during this session
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{tasks.length}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{calculateTotalHours().toFixed(1)}h</div>
                <div className="text-sm text-gray-600">Hours Logged</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {new Set(tasks.flatMap(t => t.tags || [])).size}
                </div>
                <div className="text-sm text-gray-600">Unique Tags</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tasks added yet
              </h3>
              <p className="text-gray-600 mb-4">
                Add tasks to track what you've accomplished during this session
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => {
                const categoryInfo = getCategoryInfo(task.category);
                const priorityInfo = getPriorityInfo(task.priority);

                return (
                  <div 
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{task.task}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-gray-600 mb-2">{task.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {task.hoursSpent && task.hoursSpent > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {task.hoursSpent}h
                          </div>
                        )}
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="h-4 w-4" />
                            {task.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Task Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="task">Task Description *</Label>
              <Input
                id="task"
                value={taskForm.task}
                onChange={(e) => setTaskForm(prev => ({ ...prev, task: e.target.value }))}
                placeholder="Brief description of the task completed..."
                className={errors.task ? 'border-red-500' : ''}
                maxLength={200}
              />
              {errors.task && (
                <p className="text-sm text-red-600">{errors.task}</p>
              )}
            </div>

            {/* Detailed Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Details (Optional)</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about the task..."
                className="min-h-[80px]"
                maxLength={1000}
              />
            </div>

            {/* Hours Spent */}
            <div className="space-y-2">
              <Label htmlFor="hours">Hours Spent</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={taskForm.hoursSpent}
                onChange={(e) => setTaskForm(prev => ({ ...prev, hoursSpent: parseFloat(e.target.value) || 0 }))}
                className={errors.hoursSpent ? 'border-red-500' : ''}
              />
              {errors.hoursSpent && (
                <p className="text-sm text-red-600">{errors.hoursSpent}</p>
              )}
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={taskForm.category}
                  onValueChange={(value: TaskCategory) => setTaskForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value: TaskPriority) => setTaskForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskPriorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {taskForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {taskForm.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={loading || !taskForm.task.trim()}>
              {loading ? 'Adding...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};