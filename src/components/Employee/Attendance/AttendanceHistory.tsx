// components/employee/attendance/AttendanceHistory.tsx
'use client';

import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  DatePicker,
  Select,
  Row,
  Col,
  Tooltip,
  Modal,
  Typography,
  List,
} from 'antd';
import {
  EyeOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { format, parseISO } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';
import { AttendanceRecord } from './types';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

interface AttendanceHistoryProps {
  records: AttendanceRecord[];
  loading: boolean;
  onFilter: (params: Record<string, string>) => void;
}

// generic omit helper to avoid unused vars in destructuring
const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const clone = { ...obj };
  for (const k of keys) delete clone[k];
  return clone as Omit<T, K>;
};

export default function AttendanceHistory({
  records,
  loading,
  onFilter,
}: AttendanceHistoryProps) {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'green';
      case 'late':
        return 'orange';
      case 'absent':
        return 'red';
      case 'half-day':
        return 'blue';
      case 'on-leave':
        return 'purple';
      case 'remote':
        return 'cyan';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'late':
        return 'Late';
      case 'absent':
        return 'Absent';
      case 'half-day':
        return 'Half Day';
      case 'on-leave':
        return 'On Leave';
      case 'remote':
        return 'Remote';
      default:
        return status;
    }
  };

  const handleFilter = () => {
    onFilter(filters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFilter({});
  };

  const showDetails = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setDetailsVisible(true);
  };

  const columns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => format(parseISO(date), 'MMM dd, yyyy'),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: AttendanceRecord) => (
        <Space>
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
          {record.isRemote && (
            <Tooltip title="Remote Work">
              <Tag color="blue" icon={<EnvironmentOutlined />}>
                Remote
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Check In',
      dataIndex: 'checkIn',
      key: 'checkIn',
      render: (checkIn: string) => (checkIn ? format(parseISO(checkIn), 'hh:mm a') : '-'),
    },
    {
      title: 'Check Out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      render: (checkOut: string) => (checkOut ? format(parseISO(checkOut), 'hh:mm a') : '-'),
    },
    {
      title: 'Total Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (hours: number) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{hours?.toFixed(1) || '0'} hrs</Text>
        </Space>
      ),
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      render: (shift: string) => {
        const shiftLabels = {
          morning: 'Morning',
          evening: 'Evening',
          night: 'Night',
          flexible: 'Flexible',
        };
        return shiftLabels[shift as keyof typeof shiftLabels] || shift;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_unused, record) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => showDetails(record)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Attendance History"
      extra={
        <Button icon={<FilterOutlined />} onClick={handleFilter} type="primary">
          Apply Filters
        </Button>
      }
    >
      {/* Filters */}
      <Row gutter={16} className="mb-4">
        <Col xs={24} sm={12} md={8}>
          <RangePicker
            placeholder={['Start Date', 'End Date']}
            onChange={(dates) => {
              if (dates) {
                setFilters({
                  ...filters,
                  startDate: dates[0]?.toISOString() || '',
                  endDate: dates[1]?.toISOString() || '',
                });
              } else {
                setFilters(omit(filters, ['startDate', 'endDate']));
              }
            }}
            style={{ width: '100%' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => {
              if (value) {
                setFilters({ ...filters, status: value });
              } else {
                setFilters(omit(filters, ['status']));
              }
            }}
          >
            <Option value="present">Present</Option>
            <Option value="late">Late</Option>
            <Option value="absent">Absent</Option>
            <Option value="half-day">Half Day</Option>
            <Option value="on-leave">On Leave</Option>
            <Option value="remote">Remote</Option>
          </Select>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Select
            placeholder="Remote Work"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => {
              if (value !== undefined && value !== null && value !== '') {
                setFilters({ ...filters, isRemote: value });
              } else {
                setFilters(omit(filters, ['isRemote']));
              }
            }}
          >
            <Option value="true">Remote Only</Option>
            <Option value="false">Office Only</Option>
          </Select>
        </Col>
        {Object.keys(filters).length > 0 && (
          <Col xs={24} sm={12} md={8}>
            <Button onClick={handleClearFilters}>Clear Filters</Button>
          </Col>
        )}
      </Row>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={records}
        loading={loading}
        rowKey={(record) => record.id || record._id || `${record.employeeId}-${record.date}`}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
        }}
        scroll={{ x: 800 }}
      />

      {/* Details Modal */}
      <Modal
        title={`Attendance Details - ${
          selectedRecord ? format(parseISO(selectedRecord.date), 'MMM dd, yyyy') : ''
        }`}
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <Title level={5}>Basic Information</Title>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Status: </Text>
                  <Tag color={getStatusColor(selectedRecord.status)}>
                    {getStatusText(selectedRecord.status)}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Shift: </Text>
                  <Text>{selectedRecord.shift}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Check In: </Text>
                  <Text>{format(parseISO(selectedRecord.checkIn), 'hh:mm a')}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Check Out: </Text>
                  <Text>
                    {selectedRecord.checkOut
                      ? format(parseISO(selectedRecord.checkOut), 'hh:mm a')
                      : 'Not checked out'}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Total Hours: </Text>
                  <Text>{selectedRecord.totalHours?.toFixed(1) || '0'} hours</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Remote Work: </Text>
                  <Text>{selectedRecord.isRemote ? 'Yes' : 'No'}</Text>
                </Col>
              </Row>
            </div>

            {/* Breaks */}
            {selectedRecord.breaks && selectedRecord.breaks.length > 0 && (
              <div>
                <Title level={5}>
                  Breaks ({selectedRecord.totalBreakMinutes || 0} minutes total)
                </Title>
                <List
                  dataSource={selectedRecord.breaks}
                  renderItem={(breakItem, index) => (
                    <List.Item key={`break-${index}`}>
                      <div>
                        <Text strong>Break {index + 1}: </Text>
                        <Text>
                          {format(parseISO(breakItem.start), 'hh:mm a')} -{' '}
                          {breakItem.end ? format(parseISO(breakItem.end), 'hh:mm a') : 'Ongoing'}
                        </Text>
                        {breakItem.type && <Tag className="ml-2">{breakItem.type}</Tag>}
                        {breakItem.notes && (
                          <div className="text-gray-500 text-sm">{breakItem.notes}</div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {/* Namaz */}
            {selectedRecord.namaz && selectedRecord.namaz.length > 0 && (
              <div>
                <Title level={5}>
                  Prayer Times ({selectedRecord.totalNamazMinutes || 0} minutes total)
                </Title>
                <List
                  dataSource={selectedRecord.namaz}
                  renderItem={(namazItem, index) => (
                    <List.Item key={`namaz-${index}`}>
                      <div>
                        <Text strong>{namazItem.type || `Prayer ${index + 1}`}: </Text>
                        <Text>
                          {format(parseISO(namazItem.start), 'hh:mm a')} -{' '}
                          {namazItem.end ? format(parseISO(namazItem.end), 'hh:mm a') : 'Ongoing'}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {/* Tasks */}
            {selectedRecord.tasksCompleted && selectedRecord.tasksCompleted.length > 0 && (
              <div>
                <Title level={5}>Tasks Completed</Title>
                <List
                  dataSource={selectedRecord.tasksCompleted}
                  renderItem={(task, index) => (
                    <List.Item key={`task-${index}`}>
                      <div className="w-full">
                        <div className="flex justify-between items-start">
                          <Text strong>{task.task}</Text>
                          {task.hoursSpent && <Tag color="blue">{task.hoursSpent} hrs</Tag>}
                        </div>
                        {task.description && (
                          <div className="text-gray-500 mt-1">{task.description}</div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {/* Notes and Reasons */}
            {(selectedRecord.checkInReason ||
              selectedRecord.checkOutReason ||
              selectedRecord.notes) && (
              <div>
                <Title level={5}>Additional Information</Title>
                {selectedRecord.checkInReason && (
                  <div className="mb-2">
                    <Text strong>Check-in Reason: </Text>
                    <Text>{selectedRecord.checkInReason}</Text>
                  </div>
                )}
                {selectedRecord.checkOutReason && (
                  <div className="mb-2">
                    <Text strong>Check-out Reason: </Text>
                    <Text>{selectedRecord.checkOutReason}</Text>
                  </div>
                )}
                {selectedRecord.notes && (
                  <div>
                    <Text strong>Notes: </Text>
                    <Text>{selectedRecord.notes}</Text>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
