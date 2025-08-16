"use client";

import { useEffect, useState } from 'react';
import { Button, Form, Input, DatePicker, Select, Upload, message, Card, Spin } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { UploadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import { IApiResponse } from '@/types';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Use Ant Design's built-in upload request type
type CustomUploadRequest = NonNullable<UploadProps['customRequest']>;

type Props = {
  userId?: string;
  requestId?: string;
  initialValues?: {
    _id?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    attachments?: string[] | CloudinaryAttachment[];
  };
};

// Define the Cloudinary attachment type
type CloudinaryAttachment = {
  url?: string;
  secure_url?: string;
  public_id?: string;
  name?: string;
  original_filename?: string;
  format?: string;
  bytes?: number;
  type?: string;
  resource_type?: string;
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
  attachments?: (string | CloudinaryAttachment)[];
};

export default function LeaveRequestForm({ requestId, initialValues }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [existing, setExisting] = useState<OnePayload | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // Helper function to convert attachment to UploadFile format
  const convertAttachmentToUploadFile = (attachment: string | CloudinaryAttachment, index: number): UploadFile => {
    if (typeof attachment === 'string') {
      // Simple string URL
      return {
        uid: String(index),
        name: `attachment-${index + 1}`,
        status: 'done',
        url: attachment,
      };
    } else {
      // Cloudinary object
      const url = attachment.secure_url || attachment.url || '';
      const name = attachment.original_filename || attachment.name || `file-${index + 1}`;
      
      return {
        uid: attachment.public_id || String(index),
        name: name,
        status: 'done',
        url: url,
        size: attachment.bytes,
        // Store the full attachment object for later use
        response: attachment,
      };
    }
  };

  // Helper function to extract attachment data for API payload
  const extractAttachmentData = (fileItem: UploadFile): CloudinaryAttachment | string => {
    // If it's a response from upload (new file)
    if (fileItem.response && typeof fileItem.response === 'object') {
      return fileItem.response as CloudinaryAttachment;
    }
    
    // If it's an existing file with full attachment data
    if (fileItem.response && typeof fileItem.response === 'object') {
      return fileItem.response as CloudinaryAttachment;
    }
    
    // If it's an existing file with just URL
    if (fileItem.url) {
      return fileItem.url;
    }
    
    // Fallback to name if available
    return fileItem.name || '';
  };

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

        // Convert attachments to UploadFile format properly
        const initialFiles: UploadFile[] = (req.attachments || []).map((attachment, idx) => 
          convertAttachmentToUploadFile(attachment, idx)
        );
        
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
  }, [requestId, router, form]);

  const isEdit = Boolean(requestId || initialValues?._id);

  const onFinish = async (values: FormValues) => {
    try {
      setLoading(true);

      const payload = {
        type: values.type,
        startDate: values.dates[0].toDate().toISOString(),
        endDate: values.dates[1].toDate().toISOString(),
        reason: values.reason,
        // Extract attachment data properly from fileList
        attachments: fileList.map(extractAttachmentData).filter(Boolean),
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

  // FIXED: Custom upload handler with proper typing
  const handleUpload: CustomUploadRequest = async (options) => {

    try {
      setUploading(true);
      options.onProgress?.({ percent: 10 });

      // Upload to Cloudinary
      const result = await uploadFileToCloudinary(options.file as File, 'leave-attachments');
      
      options.onProgress?.({ percent: 100 });
      
      // Call onSuccess with the full Cloudinary response
      options.onSuccess?.(result, options.file);
      
      message.success(`${(options.file as File).name} uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      options.onError?.(error as Error);
      message.error(`Failed to upload ${(options.file as File).name}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    // Filter out failed uploads and process successful ones
    const processedFileList = newFileList
      .filter(file => file.status !== 'error')
      .map((file, index) => {
        if (file.originFileObj && !file.response) {
          // New file being uploaded - keep as is
          return file;
        } else if (file.response || file.url) {
          // Successfully uploaded file or existing file
          return {
            ...file,
            uid: file.uid || String(index),
            name: file.name || `file-${index + 1}`,
            status: 'done' as const,
          };
        } else {
          // Handle any malformed file objects
          return {
            ...file,
            uid: file.uid || String(index),
            name: file.name || `file-${index + 1}`,
            status: file.status || ('done' as const),
          };
        }
      });
    
    setFileList(processedFileList);
  };

  // Handle file removal
  const handleRemove = (file: UploadFile) => {
    // You could add Cloudinary deletion logic here if needed
    console.log('Removing file:', file.name);
    return true; // Allow removal
  };

  // Handle initialValues if provided directly (not via API)
  const hydratedInitial = initialValues?._id && !existing ? {
    type: initialValues.type,
    reason: initialValues.reason,
    dates: [dayjs(initialValues.startDate), dayjs(initialValues.endDate)] as [Dayjs, Dayjs],
  } : undefined;

  // Set initial file list from initialValues if provided
  useEffect(() => {
    if (initialValues?.attachments && !requestId && !existing) {
      const initialFiles: UploadFile[] = initialValues.attachments.map((attachment, idx) => 
        convertAttachmentToUploadFile(attachment, idx)
      );
      setFileList(initialFiles);
    }
  }, [initialValues, requestId, existing]);

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
            <Upload 
              fileList={fileList} 
              onChange={handleUploadChange}
              onRemove={handleRemove}
              customRequest={handleUpload}
              multiple
              maxCount={5}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
              showUploadList={{
                showDownloadIcon: true,
                showRemoveIcon: true,
                showPreviewIcon: true,
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploading} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Select Files'}
              </Button>
            </Upload>
            {fileList.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                {fileList.length} file{fileList.length !== 1 ? 's' : ''} selected
              </div>
            )}
            <div className="mt-1 text-xs text-gray-400">
              Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WebP (Max 5 files, 10MB each)
            </div>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading || uploading}
              disabled={uploading}
            >
              {isEdit ? 'Update Request' : 'Submit Request'}
            </Button>
            <Button 
              className="ml-2" 
              onClick={() => router.push('/dashboard/employee/my-leaves')}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}