// components/employee/attendance/CheckInModal.tsx
'use client';

import { Modal, Form, Select, Input, Button, Switch, message, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { EnvironmentOutlined, WarningOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface CheckInModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (record: AttendanceRecord) => void;
  existingRecord?: AttendanceRecord;
}

interface LocationData {
  longitude: number;
  latitude: number;
  address?: string;
}

interface AttendanceRecord {
  checkIn: string;
  status: string;
  shift: string;
  checkInReason?: string;
  [key: string]: unknown;
}

interface ConflictData {
  existingRecord: AttendanceRecord;
  message?: string;
}

interface FormValues {
  shift: string;
  reason?: string;
  notes?: string;
}

interface DeviceInfo {
  os: string;
  browser: string;
  ipAddress: string;
}

export default function CheckInModal({ 
  visible, 
  onCancel, 
  onSuccess,
  existingRecord 
}: CheckInModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const shiftOptions = [
    { value: 'morning', label: 'Morning (8am-4pm)' },
    { value: 'evening', label: 'Evening (4pm-12am)' },
    { value: 'night', label: 'Night (12am-8am)' },
    { value: 'flexible', label: 'Flexible Hours' },
  ];

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
          maximumAge: 300000 // 5 minutes
        });
      });

      const locationData: LocationData = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      };

      // Optional: Get address from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=YOUR_API_KEY`
        );
        const data = await response.json();
        if (data.results && data.results[0]) {
          locationData.address = data.results[0].formatted;
        }
      } catch (error) {
        // Ignore geocoding errors
        console.warn('Could not get address:', error);
      }

      setLocation(locationData);
      message.success('Location captured successfully');
    } catch (error) {
      message.error('Failed to get location. Please enable location services.');
      console.error('Geolocation error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (values: FormValues, forceCheckIn: boolean = false) => {
    setLoading(true);
    try {
      const payload = {
        shift: values.shift || 'flexible',
        checkInReason: values.reason,
        location: useLocation ? location : undefined,
        notes: values.notes,
        forceCheckIn, // Include force flag
        deviceInfo: {
          os: navigator.platform,
          browser: navigator.userAgent.split(' ').slice(-1)[0],
          ipAddress: 'client-side' // This would need to be handled server-side
        } as DeviceInfo
      };

      const response = await fetch('/api/employee/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Handle conflict (already checked in)
      if (response.status === 409 && !forceCheckIn) {
        setConflictData(data as ConflictData);
        setShowConfirmation(true);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in');
      }

      if (data.data) {
        message.success(data.message || 'Check-in successful');
        onSuccess(data.data as AttendanceRecord);
        form.resetFields();
        setLocation(null);
        setUseLocation(false);
        setShowConfirmation(false);
        setConflictData(null);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to check in');
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckIn = () => {
    form.validateFields().then((values) => {
      handleSubmit(values as FormValues, true); // Force check-in
    });
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setConflictData(null);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setLocation(null);
      setUseLocation(false);
      setShowConfirmation(false);
      setConflictData(null);
    }
  }, [visible, form]);

  // Show confirmation dialog if there's a conflict
  if (showConfirmation && conflictData) {
    return (
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <WarningOutlined className="text-orange-500" />
            <span>Already Checked In Today</span>
          </div>
        }
        open={visible}
        onCancel={handleCancelConfirmation}
        footer={[
          <Button key="cancel" onClick={handleCancelConfirmation}>
            Cancel
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            onClick={handleConfirmCheckIn}
            loading={loading}
          >
            Check In Again
          </Button>,
        ]}
        width={600}
      >
        <Alert
          message="Multiple Check-in Detected"
          description={
            <div className="space-y-3">
              <p>You have already checked in today. Here are your existing check-in details:</p>
              <div className="bg-gray-50 p-3 rounded">
                <div><strong>Previous Check-in:</strong> {new Date(conflictData.existingRecord.checkIn).toLocaleString()}</div>
                <div><strong>Status:</strong> {conflictData.existingRecord.status}</div>
                <div><strong>Shift:</strong> {conflictData.existingRecord.shift}</div>
                {conflictData.existingRecord.checkInReason && (
                  <div><strong>Reason:</strong> {conflictData.existingRecord.checkInReason}</div>
                )}
              </div>
              <p><strong>Are you sure you want to check in again?</strong></p>
              <p className="text-sm text-gray-600">
                This will create an additional attendance record for today. 
                This might be useful if you&apos;re returning to work after a break or working split shifts.
              </p>
            </div>
          }
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Check In"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form form={form} onFinish={(values) => handleSubmit(values as FormValues, false)} layout="vertical">
        {existingRecord && (
          <Alert
            message="Previous Check-in Found"
            description={`You checked in earlier today at ${new Date(existingRecord.checkIn).toLocaleString()}`}
            type="info"
            showIcon
            className="mb-4"
          />
        )}

        <Form.Item
          name="shift"
          label="Shift"
          rules={[{ required: true, message: 'Please select your shift' }]}
        >
          <Select placeholder="Select your shift">
            {shiftOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Location Tracking">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={useLocation}
                onChange={setUseLocation}
                disabled={locationLoading}
              />
              <span>Use current location for check-in</span>
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
                    <div>Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</div>
                    {location.address && <div>Address: {location.address}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason (if checking in late or multiple times)"
        >
          <TextArea rows={2} placeholder="Please provide a reason if you're checking in late or checking in again" />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Additional Notes"
        >
          <TextArea rows={2} placeholder="Any additional notes for today..." />
        </Form.Item>

        <Form.Item>
          <div className="flex space-x-2">
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              disabled={useLocation && !location && !locationLoading}
            >
              Check In
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}