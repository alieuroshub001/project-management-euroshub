"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Form, Input, Card, message } from 'antd';
import dayjs from 'dayjs'; // Add this import
import { IApiResponse } from '@/types';

const { TextArea } = Input;

type Props = {
  requestId?: string;
};

type FormValues = {
  comment: string;
};

export default function LeaveReviewForm({ requestId }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState<any>(null);
  const router = useRouter();
  const routeParams = useParams<{ requestId: string }>();
  const id = requestId ?? routeParams?.requestId;

  useEffect(() => {
    if (id) fetchLeaveRequest(id);
  }, [id]);

  const fetchLeaveRequest = async (rid: string) => {
    try {
      setLoadingInitial(true);
      const res = await fetch(`/api/hr/leave/${rid}`);
      const data: IApiResponse = await res.json();

      if (data.success) {
        setLeaveRequest(data.data);
        form.setFieldsValue({
          comment: data.data.reviewerComment || '',
        });
      } else {
        message.error(data.message ?? 'Failed to load leave request');
        router.push('/dashboard/hr/leave-requests');
      }
    } catch (e) {
      console.error('Failed to load leave request', e);
      message.error('Failed to load leave request');
      router.push('/dashboard/hr/leave-requests');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/hr/leave/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: values.comment }),
      });
      const data: IApiResponse = await res.json();

      if (data.success) {
        message.success('Comment added successfully');
        router.push(`/dashboard/hr/leave-requests/${id}`);
      } else {
        message.error(data.message || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      message.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  if (!id) return <div>Invalid request</div>;

  return (
    <Card
      title="Review Leave Request"
      loading={loadingInitial}
      extra={<Button onClick={() => router.push(`/dashboard/hr/leave-requests/${id}`)}>Back to Request</Button>}
    >
      {leaveRequest && (
        <div className="mb-6">
          <div className="font-medium">Employee: {leaveRequest.employeeId?.name || 'Unknown'}</div>
          <div className="text-gray-500">
            {dayjs(leaveRequest.startDate).format('MMM D')} - {dayjs(leaveRequest.endDate).format('MMM D, YYYY')}
          </div>
          <div className="mt-2">
            <span className="font-medium">Reason:</span> {leaveRequest.reason}
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="comment"
          label="Reviewer Comment"
          rules={[{ required: true, message: 'Please enter your comment' }]}
        >
          <TextArea rows={4} placeholder="Enter your comments about this leave request" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Submit Comment
          </Button>
          <Button className="ml-2" onClick={() => router.push(`/dashboard/hr/leave-requests/${id}`)}>
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}