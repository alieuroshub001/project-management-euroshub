"use client";

import { useState, useEffect } from 'react';
import { IApiResponse, ILeaveRequest } from '@/types';
import { Button, Table, Tag, Pagination, Select } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

type ListFilters = {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  type?: 'vacation' | 'sick' | 'personal' | 'other';
};

type ListPayload = {
  leaveRequests: ILeaveRequest[];
  total: number;
};

const statusColors: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

export default function LeaveRequestList({ filter }: { filter?: ListFilters }) {
  const [leaveRequests, setLeaveRequests] = useState<ILeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Initialize filters from props
  const [statusFilter, setStatusFilter] = useState<string | null>(filter?.status ?? null);
  const [typeFilter, setTypeFilter] = useState<string | null>(filter?.type ?? null);

  const router = useRouter();

  // Keep local state in sync if parent changes tab (filter prop changes)
  useEffect(() => {
    setStatusFilter(filter?.status ?? null);
    setTypeFilter(filter?.type ?? null);
    setPage(1); // reset page on new filter
  }, [filter?.status, filter?.type]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      let url = `/api/employee/leave?page=${page}&limit=${limit}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&type=${typeFilter}`;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter, typeFilter]);

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const columns: TableProps<ILeaveRequest>['columns'] = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => type.charAt(0).toUpperCase() + type.slice(1),
    },
    {
      title: 'Dates',
      key: 'dates',
      render: (_: unknown, record: ILeaveRequest) => (
        <span>
          {dayjs(record.startDate).format('MMM D')} - {dayjs(record.endDate).format('MMM D, YYYY')}
        </span>
      ),
    },
    {
      title: 'Days',
      key: 'days',
      render: (_: unknown, record: ILeaveRequest) => {
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
      render: (_: unknown, record: ILeaveRequest) => (
        <Link href={`/dashboard/leave/${record._id}`}>
          <Button type="link">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Only show header actions on the "All" tab (no incoming status filter) */}
      {!filter?.status && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">My Leave Requests</h2>
          <Button type="primary" onClick={() => router.push('/employee/leave/new')}>
            New Leave Request
          </Button>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <Select
          placeholder="Filter by status"
          allowClear
          style={{ width: 180 }}
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
          placeholder="Filter by type"
          allowClear
          style={{ width: 180 }}
          value={typeFilter ?? undefined}
          onChange={(v) => setTypeFilter(v ?? null)}
          options={[
            { label: 'Vacation', value: 'vacation' },
            { label: 'Sick Leave', value: 'sick' },
            { label: 'Personal', value: 'personal' },
            { label: 'Other', value: 'other' },
          ]}
        />
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
  );
}
