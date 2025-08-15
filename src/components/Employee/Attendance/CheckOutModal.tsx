// components/employee/attendance/CheckOutModal.tsx - UPDATED with mandatory tasks
'use client';

import { Modal, Form, Input, Button, Typography, Switch, message, Divider, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Task {
  task: string;
  description?: string;
  hoursSpent?: number;
  projectId?: string;
}

interface CheckOutModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface LocationData {
  longitude: number;
  latitude: number;
  address?: string;
}

interface FormValues {
  reason?: string;
  notes?: string;
}

export default function CheckOutModal({ visible, onCancel, onSuccess }: CheckOutModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<Partial<Task>>({});
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [taskError, setTaskError] = useState<string>('');

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const locationData: LocationData = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      };

      setLocation(locationData);
      message.success('Location captured successfully');
    } catch (error) {
      message.error('Failed to get location');
      // keep console for debugging
      console.error('Geolocation error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const addTask = () => {
    const name = newTask.task?.trim();
    if (!name) {
      message.warning('Please enter a task name');
      return;
    }

    // Validate hours
    if (newTask.hoursSpent !== undefined && newTask.hoursSpent !== null) {
      if (newTask.hoursSpent <= 0 || newTask.hoursSpent > 24) {
        message.warning('Hours spent must be between 0.1 and 24');
        return;
      }
    }

    const toAdd: Task = {
      task: name,
      description: newTask.description?.trim() || undefined,
      hoursSpent:
        Number.isFinite(Number(newTask.hoursSpent)) && Number(newTask.hoursSpent) > 0
          ? Number(newTask.hoursSpent)
          : undefined,
      projectId: newTask.projectId?.trim() || undefined,
    };

    setTasks((prev) => [...prev, toAdd]);
    setNewTask({});
    setTaskError(''); // Clear any error when task is added
    message.success('Task added successfully');
  };

  const removeTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
    message.success('Task removed');

    // Show error again if no tasks left
    if (tasks.length === 1) {
      setTaskError('At least one task must be added before checkout');
    }
  };

  const validateTasks = () => {
    if (tasks.length === 0) {
      setTaskError('At least one task must be added before checkout');
      return false;
    }
    setTaskError('');
    return true;
  };

  const handleSubmit = async (values: FormValues) => {
    // Validate tasks first
    if (!validateTasks()) {
      message.error('Please add at least one task before checking out');
      return;
    }

    // Calculate total hours from tasks
    const totalTaskHours = tasks.reduce((sum, task) => {
      return sum + (task.hoursSpent || 0);
    }, 0);

    // Show warning if no hours specified for any task
    const tasksWithoutHours = tasks.filter((task) => !task.hoursSpent || task.hoursSpent <= 0);
    if (tasksWithoutHours.length > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: 'Tasks without hours specified',
          content: `${tasksWithoutHours.length} task(s) don't have hours specified. Are you sure you want to continue?`,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!proceed) {
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        action: 'checkout' as const,
        checkOutReason: values.reason,
        tasksCompleted: tasks,
        location: useLocation ? location : undefined,
        notes: values.notes,
        totalTaskHours, // Include total hours for validation
      };

      console.log('Sending check-out payload:', payload);

      const response = await fetch('/api/employee/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Check-out response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check out');
      }

      if (data.data) {
        message.success(data.message || 'Check-out successful');
        onSuccess();
        form.resetFields();
        setTasks([]);
        setLocation(null);
        setUseLocation(false);
        setTaskError('');
      } else {
        throw new Error('No response data from server');
      }
    } catch (error: unknown) {
      console.error('Check-out error:', error);
      const errMessage = error instanceof Error ? error.message : 'Failed to check out';
      message.error(errMessage);
    } finally {
      setLoading(false);
    }
  };

  // Check tasks whenever tasks array changes
  useEffect(() => {
    if (visible && tasks.length === 0) {
      setTaskError('At least one task must be added before checkout');
    } else {
      setTaskError('');
    }
  }, [tasks, visible]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setTasks([]);
      setNewTask({});
      setLocation(null);
      setUseLocation(false);
      setTaskError('At least one task must be added before checkout');
    }
  }, [visible, form]);

  const totalHours = tasks.reduce((sum, task) => sum + (task.hoursSpent || 0), 0);

  return (
    <Modal
      title="Check Out"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      maskClosable={false} // Prevent accidental closure
    >
      <Form<FormValues> form={form} onFinish={handleSubmit} layout="vertical">
        {/* Mandatory Tasks Alert */}
        <Alert
          message="Tasks Required"
          description="You must add at least one task completed today before checking out. This helps track productivity and work accomplishments."
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          className="mb-4"
        />

        <Form.Item label="Location Tracking">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch checked={useLocation} onChange={setUseLocation} disabled={locationLoading} />
              <span>Use current location for check-out</span>
            </div>

            {useLocation && (
              <div>
                <Button
                  type="default"
                  icon={<EnvironmentOutlined />}
                  onClick={getCurrentLocation}
                  loading={locationLoading}
                  disabled={!!location}
                >
                  {location ? 'Location Captured' : 'Get Current Location'}
                </Button>
                {location && (
                  <div className="mt-2 text-sm text-gray-600">
                    Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item name="reason" label="Reason for early check-out (if applicable)">
          <TextArea rows={2} placeholder="Please provide a reason if checking out early..." />
        </Form.Item>

        <Divider>
          <div className="flex items-center justify-between w-full">
            <span>Tasks Completed Today *</span>
            {totalHours > 0 && (
              <Text type="secondary" className="text-sm">
                Total: {totalHours.toFixed(1)} hours
              </Text>
            )}
          </div>
        </Divider>

        {/* Task Error Display */}
        {taskError && (
          <Alert
            message={taskError}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        {/* Existing Tasks */}
        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
          {tasks.map((task, index) => (
            <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded border">
              <div className="flex-1">
                <Text strong>{task.task}</Text>
                {task.description && (
                  <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                )}
                <div className="flex space-x-4 mt-1">
                  {typeof task.hoursSpent === 'number' && task.hoursSpent > 0 && (
                    <Text className="text-xs text-blue-600">{task.hoursSpent} hours</Text>
                  )}
                  {task.projectId && (
                    <Text className="text-xs text-green-600">Project: {task.projectId}</Text>
                  )}
                </div>
              </div>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeTask(index)}
                size="small"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Task */}
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
          <Title level={5} className="mb-3">
            Add New Task
          </Title>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Task name (required) *"
              value={newTask.task || ''}
              onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
              className="border-blue-300 focus:border-blue-500"
            />
            <Input
              placeholder="Project ID (optional)"
              value={newTask.projectId || ''}
              onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
            />
            <Input
              placeholder="Hours spent (e.g. 2.5)"
              type="number"
              step="0.1"
              min="0.1"
              max="24"
              value={newTask.hoursSpent ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setNewTask({
                  ...newTask,
                  hoursSpent: val === '' ? undefined : Number(val),
                });
              }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addTask}
              disabled={!newTask.task?.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Task
            </Button>
          </div>
          <TextArea
            placeholder="Task description (optional)"
            value={newTask.description || ''}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            className="mt-2"
            rows={2}
          />
          <div className="mt-2 text-xs text-gray-600">
            <strong>Tip:</strong> Include hours spent to track your productivity accurately. Be specific about what you accomplished.
          </div>
        </div>

        <Form.Item name="notes" label="Additional Notes" className="mt-4">
          <TextArea rows={3} placeholder="Any additional notes about your workday..." />
        </Form.Item>

        <Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={tasks.length === 0 || (useLocation && !location && !locationLoading)}
              className={tasks.length === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}
            >
              {tasks.length === 0 ? 'Add Tasks First' : 'Check Out'}
            </Button>
          </div>
        </Form.Item>

        {tasks.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-2">
            <ExclamationCircleOutlined className="mr-1" />
            You must add at least one task to check out
          </div>
        )}
      </Form>
    </Modal>
  );
}
