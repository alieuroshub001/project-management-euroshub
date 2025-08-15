// components/employee/attendance/AttendanceStats.tsx
'use client';

import { Card, Statistic, Row, Col, Spin } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, HomeOutlined } from '@ant-design/icons';
import { AttendanceStats as StatsType } from './types';

interface AttendanceStatsProps {
  stats: StatsType | null;
  loading: boolean;
}

export default function AttendanceStats({ stats, loading }: AttendanceStatsProps) {
  if (loading && !stats) {
    return (
      <Card title="Statistics" className="h-full">
        <Spin />
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card title="Statistics" className="h-full">
        <p>No statistics available</p>
      </Card>
    );
  }

  const attendanceRate = stats.totalDays > 0 
    ? ((stats.presentDays / stats.totalDays) * 100).toFixed(1)
    : '0';

  return (
    <Card title="Monthly Statistics" className="h-full">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic
            title="Total Days"
            value={stats.totalDays}
            prefix={<CalendarOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Present Days"
            value={stats.presentDays}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Late Days"
            value={stats.lateDays}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Remote Days"
            value={stats.remoteDays}
            prefix={<HomeOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
        <Col span={24}>
          <Statistic
            title="Attendance Rate"
            value={attendanceRate}
            suffix="%"
            valueStyle={{ color: parseFloat(attendanceRate) >= 90 ? '#52c41a' : '#faad14' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Total Hours"
            value={stats.totalHours?.toFixed(1) || '0'}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Avg Hours/Day"
            value={stats.avgHours?.toFixed(1) || '0'}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );
}