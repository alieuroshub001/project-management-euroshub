"use client";

import { useState, useEffect } from 'react';
import { IApiResponse, ILeaveRequest } from '@/types';
import { Button, Table, Tag, Pagination, Select, Space, Input } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { SearchOutlined } from '@ant-design/icons';
import LeaveStats from './LeaveStats';

const { Search } = Input;

type ListFilters = {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  type?: 'vacation' | 'sick' | 'personal' | 'other';
};

type ListPayload = {
  leaveRequests: ILeaveRequest[];
  total: number;
  page: number;
  limit: number;
};

const statusColors: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

export default function HRLeaveRequestList() {
  const [leaveRequests, setLeaveRequests] = useState<ILeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);

  const router = useRouter();

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      let url = `/api/hr/leave?page=${page}&limit=${limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      if (employeeFilter) url += `&employeeId=${employeeFilter}`;
      if (searchTerm) url += `&search=${searchTerm}`;

      const response = await fetch(url);
      const data: IApiResponse = await response.json();

      if (data.success) {
        const payload = data.data as ListPayload;
        setLeaveRequests(payload.leaveRequests);
        setTotal(payload.total);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [page, limit, statusFilter, typeFilter, employeeFilter, searchTerm]);

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const columns: TableProps<ILeaveRequest>['columns'] = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <span>
          {(record.employeeId as any)?.name || 'Unknown Employee'}
          <br />
          <small className="text-gray-500">{(record.employeeId as any)?.email || ''}</small>
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => type.charAt(0).toUpperCase() + type.slice(1),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_, record) => (
        <span>
          {dayjs(record.startDate).format('MMM D')} - {dayjs(record.endDate).format('MMM D, YYYY')}
        </span>
      ),
    },
    {
      title: 'Days',
      key: 'days',
      render: (_, record) => {
        const days = dayjs(record.endDate).diff(record.startDate, 'day') + 1;
        return <span>{days} day{days !== 1 ? 's' : ''}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Link href={`leave-requests/${record._id}`}>
            <Button type="link">View</Button>
          </Link>
          {record.status === 'pending' && (
            <Link href={`leave-requests/${record._id}/review`}>
              <Button type="primary" size="small">
                Review
              </Button>
            </Link>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Leave Requests</h2>
        <div className="flex gap-2">
          <Button type="primary" onClick={() => router.push('leave/reports')}>
            Reports
          </Button>
        </div>
      </div>

      <LeaveStats />

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <Search
            placeholder="Search employees..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            className="w-full md:w-64"
          />

          <div className="flex flex-wrap gap-2">
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 120 }}
              value={statusFilter ?? undefined}
              onChange={(v) => setStatusFilter(v ?? null)}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
            />

            <Select
              placeholder="Type"
              allowClear
              style={{ width: 120 }}
              value={typeFilter ?? undefined}
              onChange={(v) => setTypeFilter(v ?? null)}
              options={[
                { label: 'Vacation', value: 'vacation' },
                { label: 'Sick', value: 'sick' },
                { label: 'Personal', value: 'personal' },
                { label: 'Other', value: 'other' },
              ]}
            />
          </div>
        </div>

        <Table<ILeaveRequest>
          dataSource={leaveRequests}
          loading={loading}
          rowKey={(r) => r._id}
          columns={columns}
          pagination={false}
        />

        <div className="flex justify-end mt-4">
          <Pagination
            current={page}
            pageSize={limit}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
          />
        </div>
      </div>
    </div>
  );
}