"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card, Descriptions, Badge, message, Divider } from 'antd';
import dayjs from 'dayjs';
import { IApiResponse, ILeaveRequest, IAttachment } from '@/types';

const statusColors: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
};

export default function HRLeaveRequestDetail() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const id = params?.requestId;

  const [leaveRequest, setLeaveRequest] = useState<ILeaveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) fetchLeaveRequest(id);
  }, [id]);

  const fetchLeaveRequest = async (rid: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hr/leave/${rid}`);
      const data: IApiResponse = await res.json();

      if (data.success) {
        setLeaveRequest(data.data as ILeaveRequest);
      } else {
        message.error(data.message || 'Failed to fetch leave request');
        router.push('/dashboard/hr/leave-requests'); // Fixed path
      }
    } catch (err) {
      console.error('Failed to fetch leave request:', err);
      message.error('Failed to fetch leave request');
      router.push('/dashboard/hr/leave-requests'); // Fixed path
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'comment') => {
    if (!id) return;
    try {
      setActionLoading(true);

      if (action === 'comment') {
        router.push(`/dashboard/hr/leave-requests/${id}/review`); // Fixed path
        return;
      }

      const res = await fetch(`/api/hr/leave/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data: IApiResponse = await res.json();

      if (data.success) {
        message.success(`Leave request ${action}d successfully`);
        fetchLeaveRequest(id);
      } else {
        message.error(data.message || `Failed to ${action} leave request`);
      }
    } catch (err) {
      console.error(`Failed to ${action} leave request:`, err);
      message.error(`Failed to ${action} leave request`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!id) return <div>Invalid request</div>;
  if (!leaveRequest) return <div>Loading...</div>;

  const days = dayjs(leaveRequest.endDate).diff(leaveRequest.startDate, 'day') + 1;
  const attachments: (IAttachment | string)[] = (leaveRequest.attachments ?? []) as (IAttachment | string)[];

  return (
    <Card
      title="Leave Request Details"
      loading={loading}
      extra={<Button onClick={() => router.push('/dashboard/hr/leave-requests')}>Back to List</Button>} // Fixed path
    >

      <Descriptions bordered column={1}>
        <Descriptions.Item label="Employee">
          {(leaveRequest.employeeId as any)?.name || 'Unknown Employee'}
          <br />
          <small className="text-gray-500">{(leaveRequest.employeeId as any)?.email || ''}</small>
        </Descriptions.Item>

        <Descriptions.Item label="Type">
          {leaveRequest.type.charAt(0).toUpperCase() + leaveRequest.type.slice(1)}
        </Descriptions.Item>

        <Descriptions.Item label="Dates">
          {dayjs(leaveRequest.startDate).format('MMM D, YYYY')} – {dayjs(leaveRequest.endDate).format('MMM D, YYYY')}
        </Descriptions.Item>

        <Descriptions.Item label="Days">
          {days} day{days !== 1 ? 's' : ''}
        </Descriptions.Item>

        <Descriptions.Item label="Status">
          <Badge
            color={statusColors[leaveRequest.status]}
            text={leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
          />
        </Descriptions.Item>

        <Descriptions.Item label="Reason">
          {leaveRequest.reason}
        </Descriptions.Item>

        {attachments.length > 0 && (
          <Descriptions.Item label="Attachments">
            <ul className="list-disc pl-5">
              {attachments.map((att: IAttachment | string, index: number) => {
                const url = typeof att === 'string' ? att : att.url;
                const name =
                  typeof att === 'string'
                    ? (att.split('/').pop() || 'file')
                    : (att.name ?? url.split('/').pop() ?? 'file');

                return (
                  <li key={index}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </Descriptions.Item>
        )}

        {leaveRequest.reviewedBy && (
          <>
            <Descriptions.Item label="Reviewed By">
              {(leaveRequest.reviewedBy as any)?.name || 'System'}
            </Descriptions.Item>
            <Descriptions.Item label="Reviewed At">
              {dayjs(leaveRequest.reviewedAt).format('MMM D, YYYY h:mm A')}
            </Descriptions.Item>
            {leaveRequest.reviewerComment && (
              <Descriptions.Item label="Reviewer Comment">
                {leaveRequest.reviewerComment}
              </Descriptions.Item>
            )}
          </>
        )}
      </Descriptions>

      {leaveRequest.status === 'pending' && (
        <>
          <Divider />
          <div className="flex justify-end gap-2">
            <Button 
              type="primary" 
              onClick={() => handleAction('approve')}
              loading={actionLoading}
            >
              Approve
            </Button>
            <Button 
              danger 
              onClick={() => handleAction('reject')}
              loading={actionLoading}
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleAction('comment')}
              loading={actionLoading}
            >
              Add Comment
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}