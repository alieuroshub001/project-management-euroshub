"use client";

import { useEffect, useState } from 'react';
import { Button, Form, Input, DatePicker, Select, Upload, message, Card, Spin } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { UploadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import { IApiResponse } from '@/types';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

type Props = {
  userId?: string;
  requestId?: string;
  initialValues?: {
    _id?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    attachments?: string[];
  };
};

type FormValues = {
  type: string;
  dates: [Dayjs, Dayjs];
  reason: string;
};

type OnePayload = {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachments?: string[];
};

export default function LeaveRequestForm({ requestId, initialValues }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [existing, setExisting] = useState<OnePayload | null>(null);
  const router = useRouter();

  // Load existing request when editing
  useEffect(() => {
    const load = async () => {
      if (!requestId) return;
      try {
        setLoadingInitial(true);
        const res = await fetch(`/api/employee/leave/${requestId}`);
        const data: IApiResponse = await res.json();
        if (!data.success) {
          message.error(data.message ?? 'Failed to load leave request');
          router.push('/dashboard/employee/my-leaves');
          return;
        }
        const req = data.data as OnePayload;
        setExisting(req);
        form.setFieldsValue({
          type: req.type,
          reason: req.reason,
          dates: [dayjs(req.startDate), dayjs(req.endDate)],
        });
        const initialFiles: UploadFile[] =
          (req.attachments || []).map((n, idx) => ({
            uid: String(idx),
            name: n,
            status: 'done',
            url: n,
          })) || [];
        setFileList(initialFiles);
      } catch (e) {
        console.error('Failed to load leave request', e);
        message.error('Failed to load leave request');
        router.push('/dashboard/employee/my-leaves');
      } finally {
        setLoadingInitial(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const isEdit = Boolean(requestId || initialValues?._id);

  const onFinish = async (values: FormValues) => {
    try {
      setLoading(true);

      const payload = {
        type: values.type,
        startDate: values.dates[0].toDate().toISOString(),
        endDate: values.dates[1].toDate().toISOString(),
        reason: values.reason,
        attachments: fileList.map((f) => f.url || f.name),
      };

      const url = isEdit
        ? `/api/employee/leave/${requestId || initialValues?._id}`
        : '/api/employee/leave';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          // For edit, explicitly set that this is an update, not a cancellation
          action: isEdit ? 'update' : undefined
        }),
      });

      const data: IApiResponse = await res.json();

      if (data.success) {
        message.success(data.message ?? (isEdit ? 'Updated' : 'Created'));
        router.push('/dashboard/employee/my-leaves');
      } else {
        message.error(data.message ?? 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      message.error('Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChange = ({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList);
  };

  const hydratedInitial =
    initialValues?._id && !existing
      ? {
          type: initialValues.type,
          reason: initialValues.reason,
          dates: [dayjs(initialValues.startDate), dayjs(initialValues.endDate)] as [Dayjs, Dayjs],
        }
      : undefined;

  return (
    <Card title={isEdit ? 'Edit Leave Request' : 'New Leave Request'}>
      {loadingInitial ? (
        <div className="py-12 flex items-center justify-center">
          <Spin />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={hydratedInitial}
        >
          <Form.Item
            name="type"
            label="Leave Type"
            rules={[{ required: true, message: 'Please select leave type' }]}
          >
            <Select
              placeholder="Select leave type"
              options={[
                { label: 'Vacation', value: 'vacation' },
                { label: 'Sick Leave', value: 'sick' },
                { label: 'Personal', value: 'personal' },
                { label: 'Other', value: 'other' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Date Range"
            rules={[{ required: true, message: 'Please select date range' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please enter reason for leave' }]}
          >
            <TextArea rows={4} placeholder="Enter reason for leave" />
          </Form.Item>

          <Form.Item label="Attachments">
            <Upload fileList={fileList} onChange={handleUploadChange} beforeUpload={() => false}>
              <Button icon={<UploadOutlined />}>Select Files</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? 'Update Request' : 'Submit Request'}
            </Button>
            <Button className="ml-2" onClick={() => router.push('/dashboard/employee/my-leaves')}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}