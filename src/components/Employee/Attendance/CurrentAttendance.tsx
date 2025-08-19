// Updated CurrentAttendance.tsx - Fixed getWorkingHours function for night shift
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Alert, Button, Card, Col, List, Row, Spin, Statistic, Tag, Typography, message } from 'antd';
import { differenceInMinutes, format, parseISO, addDays, isBefore } from 'date-fns';
import { useEffect, useState } from 'react';
import BreakModal from './BreakModal';
import CheckInModal from './CheckInModal';
import CheckOutModal from './CheckOutModal';
import NamazModal from './NamazModal';
import { AttendanceRecord } from './types';

const { Text, Title } = Typography;

// Define shift time boundaries
const SHIFT_TIMES = {
  morning: { start: 8, end: 16 }, // 8am to 4pm
  evening: { start: 16, end: 24 }, // 4pm to 12am (midnight)
  night: { start: 0, end: 8 }, // 12am to 8am (spans midnight)
  flexible: { start: 0, end: 24 } // Anytime
};

// Helper function to get shift end time considering night shift boundary crossing
const getShiftEndTime = (checkInTime: Date, shift: string): Date => {
  const shiftConfig = SHIFT_TIMES[shift as keyof typeof SHIFT_TIMES];
  if (!shiftConfig) return checkInTime; // Default to check-in time if unknown shift
  
  const checkInHour = checkInTime.getHours();
  let endTime = new Date(checkInTime);
  
  if (shift === 'night') {
    // Night shift: 12am-8am
    if (checkInHour >= 18) {
      // If checking in evening (6pm or later), shift ends next day at 8am
      endTime = addDays(checkInTime, 1);
      endTime.setHours(8, 0, 0, 0);
    } else if (checkInHour < 8) {
      // If checking in early morning (before 8am), shift ends same day at 8am
      endTime.setHours(8, 0, 0, 0);
    } else {
      // If checking in during day (unusual for night shift), end at 8am next day
      endTime = addDays(checkInTime, 1);
      endTime.setHours(8, 0, 0, 0);
    }
  } else if (shift === 'evening') {
    // Evening shift: 4pm-12am
    if (checkInHour >= 16) {
      // Normal evening check-in, ends at midnight same day
      endTime.setHours(23, 59, 59, 999); // End of day
    } else {
      // Early check-in for evening shift, still ends at midnight
      endTime.setHours(23, 59, 59, 999);
    }
  } else if (shift === 'morning') {
    // Morning shift: 8am-4pm
    endTime.setHours(16, 0, 0, 0);
  } else {
    // Flexible shift - no specific end time, use current time
    return new Date();
  }
  
  return endTime;
};

// Helper function to calculate working hours with proper night shift handling
const calculateWorkingHours = (checkInTime: Date, checkOutTime: Date | null, shift: string, breakMinutes = 0, namazMinutes = 0): number => {
  if (!checkOutTime) {
    // If not checked out, calculate up to current time or shift end, whichever is earlier
    const now = new Date();
    const shiftEndTime = getShiftEndTime(checkInTime, shift);
    
    // For night shift, don't cap at current time if we're still in shift hours
    let endTime = now;
    
    if (shift === 'night') {
      const currentHour = now.getHours();
      const checkInHour = checkInTime.getHours();
      
      // If it's currently within night shift hours (after 6pm or before 8am)
      if (currentHour >= 18 || currentHour < 8) {
        endTime = now; // Use current time
      } else if (currentHour >= 8 && checkInHour >= 18) {
        // If shift started yesterday evening and it's now past 8am, cap at 8am
        const today8am = new Date(now);
        today8am.setHours(8, 0, 0, 0);
        endTime = today8am;
      } else {
        endTime = now;
      }
    } else {
      // For other shifts, use minimum of current time and shift end time
      endTime = isBefore(now, shiftEndTime) ? now : shiftEndTime;
    }
    
    const workedMinutes = differenceInMinutes(endTime, checkInTime);
    const netMinutes = Math.max(0, workedMinutes - breakMinutes - namazMinutes);
    return netMinutes / 60;
  } else {
    // Normal calculation for checked out records
    const workedMinutes = differenceInMinutes(checkOutTime, checkInTime);
    const netMinutes = Math.max(0, workedMinutes - breakMinutes - namazMinutes);
    return netMinutes / 60;
  }
};

// Define types for API payloads
interface BreakPayload {
  action: string;
  recordId: string;
  breakType?: string;
  breakNotes?: string;
}

interface NamazPayload {
  action: string;
  recordId: string;
  namazType?: string;
}

interface CurrentAttendanceProps {
  currentRecord: AttendanceRecord | null;
  setCurrentRecord: (record: AttendanceRecord) => void;
  onCheckInSuccess: (record: AttendanceRecord) => void;
  onCheckOutSuccess: () => void;
  onRecordUpdate?: (record: AttendanceRecord) => void;
  loading: boolean;
  allTodayRecords?: AttendanceRecord[];
}

export default function CurrentAttendance({ 
  currentRecord, 
  setCurrentRecord,
  onCheckInSuccess,
  onCheckOutSuccess,
  onRecordUpdate,
  loading,
  allTodayRecords = []
}: CurrentAttendanceProps) {
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkOutModalVisible, setCheckOutModalVisible] = useState(false);
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [namazModalVisible, setNamazModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Debug effect to log currentRecord changes
  useEffect(() => {
    console.log('CurrentAttendance - currentRecord changed:', currentRecord);
    console.log('CurrentAttendance - allTodayRecords:', allTodayRecords);
  }, [currentRecord, allTodayRecords]);

  const handleBreakAction = async (action: 'start' | 'end', breakType?: string, breakNotes?: string) => {
    if (!currentRecord) {
      message.error('No active attendance record found');
      return;
    }

    setActionLoading(`break-${action}`);
    try {
      const payload: BreakPayload = {
        action: `break-${action}`,
        recordId: currentRecord.id,
      };

      if (action === 'start') {
        payload.breakType = breakType || 'break';
        payload.breakNotes = breakNotes;
      }

      const response = await fetch('/api/employee/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} break`);
      }

      if (data.data) {
        setCurrentRecord(data.data);
        onRecordUpdate?.(data.data);
        message.success(data.message || `Break ${action}ed successfully`);
      }
      setBreakModalVisible(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} break`;
      message.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNamazAction = async (action: 'start' | 'end', namazType?: string) => {
    if (!currentRecord) {
      message.error('No active attendance record found');
      return;
    }

    setActionLoading(`namaz-${action}`);
    try {
      const payload: NamazPayload = {
        action: `namaz-${action}`,
        recordId: currentRecord.id,
      };

      if (action === 'start') {
        payload.namazType = namazType;
      }

      const response = await fetch('/api/employee/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} namaz`);
      }

      if (data.data) {
        setCurrentRecord(data.data);
        onRecordUpdate?.(data.data);
        message.success(data.message || `Prayer time ${action}ed successfully`);
      }
      setNamazModalVisible(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} namaz`;
      message.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper functions
  const isBreakActive = currentRecord?.breaks?.some(b => !b.end) ?? false;
  const isNamazActive = currentRecord?.namaz?.some(n => !n.end) ?? false;
  const hasCheckedOut = !!currentRecord?.checkOut;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'green';
      case 'late': return 'orange';
      case 'absent': return 'red';
      case 'half-day': return 'blue';
      case 'on-leave': return 'purple';
      case 'remote': return 'cyan';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'absent': return 'Absent';
      case 'half-day': return 'Half Day';
      case 'on-leave': return 'On Leave';
      case 'remote': return 'Remote';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case 'morning': return 'Morning (8am-4pm)';
      case 'evening': return 'Evening (4pm-12am)';
      case 'night': return 'Night (12am-8am)';
      case 'flexible': return 'Flexible Hours';
      default: return shift;
    }
  };

  // FIXED: Working hours calculation with proper night shift handling
  const getWorkingHours = () => {
    if (!currentRecord?.checkIn) return 0;
    
    const checkInTime = parseISO(currentRecord.checkIn);
    const checkOutTime = currentRecord.checkOut ? parseISO(currentRecord.checkOut) : null;
    const shift = currentRecord.shift || 'flexible';
    
    // Get break and namaz minutes
    const breakMinutes = currentRecord.totalBreakMinutes || 0;
    const namazMinutes = currentRecord.totalNamazMinutes || 0;
    
    return calculateWorkingHours(checkInTime, checkOutTime, shift, breakMinutes, namazMinutes);
  };

  // Get shift progress for night shift workers
  const getShiftProgress = () => {
    if (!currentRecord?.checkIn || hasCheckedOut) return null;
    
    const shift = currentRecord.shift || 'flexible';
    if (shift === 'flexible') return null;
    
    const checkInTime = parseISO(currentRecord.checkIn);
    const shiftEndTime = getShiftEndTime(checkInTime, shift);
    const now = new Date();
    
    // For night shift, show progress differently
    if (shift === 'night') {
      const totalShiftMinutes = 8 * 60; // 8 hours
      const workedMinutes = differenceInMinutes(now, checkInTime);
      const progress = Math.min((workedMinutes / totalShiftMinutes) * 100, 100);
      
      return {
        progress: progress,
        timeRemaining: Math.max(0, totalShiftMinutes - workedMinutes),
        shiftEnd: shiftEndTime
      };
    }
    
    return null;
  };

  const getActiveBreakDuration = () => {
    if (!isBreakActive || !currentRecord?.breaks) return 0;
    
    const activeBreak = currentRecord.breaks.find(b => !b.end);
    if (!activeBreak) return 0;
    
    return differenceInMinutes(currentTime, parseISO(activeBreak.start));
  };

  const getActiveNamazDuration = () => {
    if (!isNamazActive || !currentRecord?.namaz) return 0;
    
    const activeNamaz = currentRecord.namaz.find(n => !n.end);
    if (!activeNamaz) return 0;
    
    return differenceInMinutes(currentTime, parseISO(activeNamaz.start));
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleCheckInSuccess = (record: AttendanceRecord) => {
    console.log('CurrentAttendance - handleCheckInSuccess called with:', record);
    onCheckInSuccess(record);
    setCheckInModalVisible(false);
  };

  const handleCheckOutSuccess = () => {
    console.log('CurrentAttendance - handleCheckOutSuccess called');
    onCheckOutSuccess();
    setCheckOutModalVisible(false);
  };

  // Get today's completed records (checked out)
  const todayCompletedRecords = allTodayRecords.filter(record => !!record.checkOut);
  const shiftProgress = getShiftProgress();

  console.log('CurrentAttendance render - currentRecord:', currentRecord);
  console.log('CurrentAttendance render - loading:', loading);

  if (loading && !currentRecord && allTodayRecords.length === 0) {
    return (
      <Card title="Today's Attendance" className="mb-6">
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card 
        title={
          <div className="flex justify-between items-center">
            <Title level={4} className="mb-0 flex items-center">
              <CalendarOutlined className="mr-2" />
              Today&apos;s Attendance
            </Title>
            <Text type="secondary">
              {format(currentTime, 'MMM dd, yyyy - hh:mm a')}
            </Text>
          </div>
        }
      >
        {/* Current Active Record */}
        {currentRecord ? (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <Text strong className="text-lg">Currently Active Session</Text>
                  {hasCheckedOut && (
                    <Tag color="red" icon={<CheckCircleOutlined />}>
                      CHECKED OUT
                    </Tag>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Session started</div>
                  <div className="font-semibold">{format(parseISO(currentRecord.checkIn), 'hh:mm a')}</div>
                </div>
              </div>
            </div>

            {/* Night Shift Progress Indicator */}
            {shiftProgress && currentRecord.shift === 'night' && !hasCheckedOut && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Text strong className="text-indigo-800">Night Shift Progress</Text>
                  <Text className="text-indigo-600 text-sm">
                    Ends at {format(shiftProgress.shiftEnd, 'hh:mm a')}
                  </Text>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${shiftProgress.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-indigo-600">
                  <span>{shiftProgress.progress.toFixed(1)}% complete</span>
                  <span>{formatDuration(shiftProgress.timeRemaining)} remaining</span>
                </div>
              </div>
            )}

            {/* Main Stats */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <div className="text-center bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-500 text-sm mb-1">Status</div>
                  <Tag color={getStatusColor(currentRecord.status)} className="text-sm font-semibold">
                    {getStatusText(currentRecord.status)}
                  </Tag>
                  {currentRecord.isRemote && (
                    <Tag color="blue" icon={<EnvironmentOutlined />} className="mt-1">
                      REMOTE
                    </Tag>
                  )}
                </div>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Statistic
                    title="Check In Time"
                    value={format(parseISO(currentRecord.checkIn), 'hh:mm a')}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ fontSize: '18px' }}
                  />
                </div>
              </Col>

              {hasCheckedOut ? (
                <Col xs={24} sm={12} md={6}>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Statistic
                      title="Check Out Time"
                      value={format(parseISO(currentRecord.checkOut!), 'hh:mm a')}
                      prefix={<LogoutOutlined />}
                      valueStyle={{ fontSize: '18px', color: '#f5222d' }}
                    />
                  </div>
                </Col>
              ) : (
                <Col xs={24} sm={12} md={6}>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <Statistic
                      title="Working Hours"
                      value={getWorkingHours().toFixed(1)}
                      suffix="hrs"
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                    />
                  </div>
                </Col>
              )}
              
              <Col xs={24} sm={12} md={6}>
                <div className="text-center bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-500 text-sm mb-1">Shift</div>
                  <Text strong className="text-sm">
                    {getShiftLabel(currentRecord.shift || 'flexible')}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* Active Status Alerts */}
            {isBreakActive && (
              <Alert
                message={
                  <div className="flex items-center justify-between">
                    <span>Currently on break ({formatDuration(getActiveBreakDuration())})</span>
                    <Button 
                      size="small" 
                      type="primary"
                      onClick={() => setBreakModalVisible(true)}
                      loading={actionLoading === 'break-end'}
                    >
                      End Break
                    </Button>
                  </div>
                }
                type="warning"
                showIcon
                className="animate-pulse"
              />
            )}

            {isNamazActive && (
              <Alert
                message={
                  <div className="flex items-center justify-between">
                    <span>Currently in prayer time ({formatDuration(getActiveNamazDuration())})</span>
                    <Button 
                      size="small" 
                      type="primary"
                      onClick={() => setNamazModalVisible(true)}
                      loading={actionLoading === 'namaz-end'}
                    >
                      End Prayer
                    </Button>
                  </div>
                }
                type="info"
                showIcon
                className="animate-pulse"
              />
            )}

            {/* Break and Namaz Summary */}
            {((currentRecord.breaks && currentRecord.breaks.length > 0) || (currentRecord.namaz && currentRecord.namaz.length > 0)) && (
              <Row gutter={[16, 16]}>
                {currentRecord.breaks && currentRecord.breaks.length > 0 && (
                  <Col xs={24} sm={12}>
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Text strong className="flex items-center">
                          <PauseCircleOutlined className="mr-1" />
                          Breaks Today
                        </Text>
                        <Tag color="orange">{currentRecord.breaks.length}</Tag>
                      </div>
                      <Text type="secondary" className="text-sm">
                        Total time: {formatDuration(currentRecord.totalBreakMinutes || 0)}
                      </Text>
                    </div>
                  </Col>
                )}
                
                {currentRecord.namaz && currentRecord.namaz.length > 0 && (
                  <Col xs={24} sm={12}>
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Text strong className="flex items-center">
                          <UserOutlined className="mr-1" />
                          Prayers Today
                        </Text>
                        <Tag color="blue">{currentRecord.namaz.length}</Tag>
                      </div>
                      <Text type="secondary" className="text-sm">
                        Total time: {formatDuration(currentRecord.totalNamazMinutes || 0)}
                      </Text>
                    </div>
                  </Col>
                )}
              </Row>
            )}

            {/* Tasks Completed (if checked out) */}
            {hasCheckedOut && currentRecord.tasksCompleted && currentRecord.tasksCompleted.length > 0 && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Text strong className="flex items-center">
                    <CheckCircleOutlined className="mr-1" />
                    Tasks Completed Today
                  </Text>
                  <Tag color="green">{currentRecord.tasksCompleted.length} tasks</Tag>
                </div>
                <List
                  size="small"
                  dataSource={currentRecord.tasksCompleted}
                  renderItem={(task, index) => (
                    <List.Item key={index} className="border-none py-1">
                      <div className="w-full">
                        <div className="flex justify-between items-start">
                          <Text strong className="text-sm">{task.task}</Text>
                          {task.hoursSpent && (
                            <Tag color="blue" className="text-xs">{task.hoursSpent}h</Tag>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {/* Reasons and Notes */}
            {(currentRecord.checkInReason || currentRecord.checkOutReason || currentRecord.notes) && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <InfoCircleOutlined className="mr-2 text-yellow-600" />
                  <Text strong>Additional Information</Text>
                </div>
                {currentRecord.checkInReason && (
                  <div className="mb-2">
                    <Text strong>Check-in Reason: </Text>
                    <Text className="text-sm">{currentRecord.checkInReason}</Text>
                  </div>
                )}
                {currentRecord.checkOutReason && (
                  <div className="mb-2">
                    <Text strong>Check-out Reason: </Text>
                    <Text className="text-sm">{currentRecord.checkOutReason}</Text>
                  </div>
                )}
                {currentRecord.notes && (
                  <div>
                    <Text strong>Notes: </Text>
                    <Text className="text-sm">{currentRecord.notes}</Text>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!hasCheckedOut && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <Text strong className="flex items-center">
                    <ExclamationCircleOutlined className="mr-2" />
                    Quick Actions
                  </Text>
                  <Text type="secondary" className="text-sm">Session is active</Text>
                </div>
                <Row gutter={[12, 12]} justify="center">
                  <Col>
                    <Button 
                      type={isBreakActive ? "primary" : "default"}
                      icon={isBreakActive ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                      onClick={() => setBreakModalVisible(true)}
                      disabled={isNamazActive}
                      size="large"
                      loading={actionLoading?.startsWith('break')}
                      className={isBreakActive ? 'bg-orange-500 border-orange-500' : ''}
                    >
                      {isBreakActive ? 'End Break' : 'Take Break'}
                    </Button>
                  </Col>
                  
                  <Col>
                    <Button 
                      type={isNamazActive ? "primary" : "default"}
                      icon={isNamazActive ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                      onClick={() => setNamazModalVisible(true)}
                      disabled={isBreakActive}
                      size="large"
                      loading={actionLoading?.startsWith('namaz')}
                      className={isNamazActive ? 'bg-blue-500 border-blue-500' : ''}
                    >
                      {isNamazActive ? 'End Prayer' : 'Prayer Time'}
                    </Button>
                  </Col>
                  
                  <Col>
                    <Button 
                      type="primary" 
                      danger
                      icon={<LogoutOutlined />}
                      onClick={() => setCheckOutModalVisible(true)}
                      disabled={isBreakActive || isNamazActive}
                      size="large"
                    >
                      Check Out
                    </Button>
                  </Col>
                </Row>

                {/* Disable actions warning */}
                {(isBreakActive || isNamazActive) && (
                  <Alert
                    message="Some actions are disabled while on break or during prayer time"
                    type="info"
                    showIcon
                    className="mt-3 text-center"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          /* No Active Record */
          <div className="text-center py-8">
            <div className="mb-4">
              <ClockCircleOutlined className="text-6xl text-gray-300" />
            </div>
            <Title level={3} type="secondary" className="mb-2">No Active Session</Title>
            <Text type="secondary" className="block mb-6 text-lg">
              You haven&apos;t checked in today or have already checked out
            </Text>
            <Button 
              type="primary" 
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={() => setCheckInModalVisible(true)}
              className="bg-green-500 hover:bg-green-600 border-green-500"
            >
              Check In Now
            </Button>
          </div>
        )}
      </Card>

      {/* Today's Completed Sessions */}
      {todayCompletedRecords.length > 0 && (
        <Card 
          title={
            <div className="flex items-center">
              <CheckCircleOutlined className="mr-2 text-green-500" />
              Completed Sessions Today ({todayCompletedRecords.length})
            </div>
          }
        >
          <List
            dataSource={todayCompletedRecords}
            renderItem={(record, index) => (
              <List.Item key={record.id || index}>
                <div className="w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text strong>
                        {format(parseISO(record.checkIn), 'hh:mm a')} - {' '}
                        {record.checkOut ? format(parseISO(record.checkOut), 'hh:mm a') : 'No checkout'}
                      </Text>
                      <div className="flex items-center space-x-2 mt-1">
                        <Tag color={getStatusColor(record.status)}>
                          {getStatusText(record.status)}
                        </Tag>
                        {record.isRemote && (
                          <Tag color="blue" icon={<EnvironmentOutlined />}>
                            Remote
                          </Tag>
                        )}
                        {record.tasksCompleted && record.tasksCompleted.length > 0 && (
                          <Tag color="green">
                            {record.tasksCompleted.length} tasks
                          </Tag>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Text type="secondary" className="text-sm">
                        {record.totalHours?.toFixed(1) || '0'} hours
                      </Text>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Modals */}
      <CheckInModal
        visible={checkInModalVisible}
        onCancel={() => setCheckInModalVisible(false)}
        onSuccess={handleCheckInSuccess}
        existingRecord={allTodayRecords.length > 0 ? allTodayRecords[0] : undefined}
      />

      <CheckOutModal
        visible={checkOutModalVisible}
        onCancel={() => setCheckOutModalVisible(false)}
        onSuccess={handleCheckOutSuccess}
      />

      <BreakModal
        visible={breakModalVisible}
        onCancel={() => setBreakModalVisible(false)}
        onAction={handleBreakAction}
        isBreakActive={isBreakActive}
      />

      <NamazModal
        visible={namazModalVisible}
        onCancel={() => setNamazModalVisible(false)}
        onAction={handleNamazAction}
        isNamazActive={isNamazActive}
      />
    </div>
  );
}