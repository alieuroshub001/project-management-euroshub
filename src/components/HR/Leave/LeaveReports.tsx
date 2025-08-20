"use client";

import { useState, useEffect } from 'react';
import { IApiResponse } from '@/types';
import { Table, DatePicker, Select, Button, Card, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;
const { Option } = Select;

type LeaveReportData = {
  key: string;
  employee: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
};

export default function LeaveReports() {
  const [data, setData] = useState<LeaveReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [department, setDepartment] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  useEffect(() => {
    fetchReportData();
  }, [dateRange, department, status]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [startDate, endDate] = dateRange;
      const url = `/api/hr/leave/reports?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&department=${department}&status=${status}`;
      
      const response = await fetch(url);
      const result: IApiResponse = await response.json();

      if (result.success) {
        const formattedData = (result.data as any[]).map((item) => {
          // Safely access employee data with fallbacks
          const employeeName = item.employeeId?.name || 'Unknown Employee';
          const employeeDept = item.employeeId?.department || 'Unknown Department';

          return {
            key: item._id,
            employee: employeeName,
            department: employeeDept,
            type: item.type,
            startDate: dayjs(item.startDate).format('MMM D, YYYY'),
            endDate: dayjs(item.endDate).format('MMM D, YYYY'),
            days: dayjs(item.endDate).diff(item.startDate, 'day') + 1,
            status: item.status,
          };
        });
        setData(formattedData);
      } else {
        message.error(result.message || 'Failed to fetch report data');
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      message.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
    XLSX.writeFile(workbook, 'LeaveReport.xlsx');
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => text.charAt(0).toUpperCase() + text.slice(1),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
    },
    {
      title: 'Days',
      dataIndex: 'days',
      key: 'days',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => text.charAt(0).toUpperCase() + text.slice(1),
    },
  ];

  return (
    <Card
      title="Leave Reports"
      extra={
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={exportToExcel}
        >
          Export to Excel
        </Button>
      }
    >
      <div className="flex flex-wrap gap-4 mb-6">
        <RangePicker
          defaultValue={dateRange}
          onChange={handleDateChange}
          style={{ width: 250 }}
        />
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
        <Select
          defaultValue="all"
          style={{ width: 150 }}
          onChange={setStatus}
        >
          <Option value="all">All Statuses</Option>
          <Option value="approved">Approved</Option>
          <Option value="pending">Pending</Option>
          <Option value="rejected">Rejected</Option>
          <Option value="cancelled">Cancelled</Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />
    </Card>
  );
}