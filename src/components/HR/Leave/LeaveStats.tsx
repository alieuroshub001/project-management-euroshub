"use client";

import { useState, useEffect } from 'react';
import { IApiResponse } from '@/types';
import { Card, Select, DatePicker } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

type LeaveStatsData = {
  month: string;
  approved: number;
  pending: number;
  rejected: number;
};

export default function HRLeaveStats() {
  const [stats, setStats] = useState<LeaveStatsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year'),
  ]);

  useEffect(() => {
    fetchLeaveStats();
  }, [department, dateRange]);

  const fetchLeaveStats = async () => {
    try {
      setLoading(true);
      const [startDate, endDate] = dateRange;
      const url = `/api/hr/leave/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&department=${department}`;
      
      const response = await fetch(url);
      const data: IApiResponse = await response.json();

      if (data.success) {
        setStats(data.data as LeaveStatsData[]);
      }
    } catch (error) {
      console.error('Failed to fetch leave stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  return (
    <Card
      title="Leave Statistics"
      loading={loading}
      extra={
        <div className="flex gap-2">
          <Select
            defaultValue="all"
            style={{ width: 150 }}
            onChange={setDepartment}
          >
            <Option value="all">All Departments</Option>
            <Option value="engineering">Engineering</Option>
            <Option value="marketing">Marketing</Option>
            <Option value="hr">HR</Option>
            <Option value="finance">Finance</Option>
          </Select>
          <RangePicker
            defaultValue={dateRange}
            onChange={handleDateChange}
          />
        </div>
      }
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stats}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="approved" stackId="a" fill="#52c41a" name="Approved" />
            <Bar dataKey="pending" stackId="a" fill="#faad14" name="Pending" />
            <Bar dataKey="rejected" stackId="a" fill="#f5222d" name="Rejected" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}