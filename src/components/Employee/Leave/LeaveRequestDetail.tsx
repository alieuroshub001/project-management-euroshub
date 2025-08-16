// ./src/components/Employee/Leave/LeaveRequestDetail.tsx - FIXED VERSION
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button, Card, Descriptions, Badge, message, Popconfirm, Space, Divider } from "antd";
import { DownloadOutlined, EyeOutlined, FileOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { IApiResponse, ILeaveRequest, IAttachment, UserRole } from "@/types";

// Define interface for populated user reference
interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

type Props = {
  requestId?: string;
  userId?: string;
  role?: UserRole;
};

const statusColors: Record<ILeaveRequest["status"], string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
  cancelled: "gray",
};

export default function LeaveRequestDetail({ requestId }: Props) {
  const router = useRouter();
  const routeParams = useParams<{ requestId: string }>();
  const id = requestId ?? routeParams?.requestId;

  const [leaveRequest, setLeaveRequest] = useState<ILeaveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // FIXED: Use useCallback to memoize fetchLeaveRequest
  const fetchLeaveRequest = useCallback(async (rid: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employee/leave/${rid}`);
      const data: IApiResponse<ILeaveRequest> = await res.json();

      if (data.success && data.data) {
        setLeaveRequest(data.data);
      } else {
        message.error(data.message || "Failed to fetch leave request");
        router.push("/dashboard/employee/my-leaves");
      }
    } catch (err) {
      console.error("Failed to fetch leave request:", err);
      message.error("Failed to fetch leave request");
      router.push("/dashboard/employee/my-leaves");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (id) void fetchLeaveRequest(id);
  }, [id, fetchLeaveRequest]);

  const handleAction = async (action: "approve" | "reject" | "cancel" | "delete") => {
    if (!id) return;
    try {
      setActionLoading(true);

      if (action === "delete") {
        const res = await fetch(`/api/employee/leave/${id}`, { method: "DELETE" });
        const data: IApiResponse<null> = await res.json();

        if (data.success) {
          message.success("Leave request deleted successfully");
          router.push("/dashboard/employee/my-leaves");
        } else {
          message.error(data.message || "Failed to delete leave request");
        }
        return;
      }

      const res = await fetch(`/api/employee/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data: IApiResponse<ILeaveRequest> = await res.json();

      if (data.success) {
        message.success(`Leave request ${action}d successfully`);
        await fetchLeaveRequest(id);
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

  // Helper function to get file extension from filename
  const getFileExtension = (filename: string): string => {
    if (!filename || typeof filename !== 'string') return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
  };

  // Helper function to determine file type from multiple sources
  const getFileType = (attachment: IAttachment): 'image' | 'document' => {
    // Check resource_type first
    if (attachment.resource_type === 'image') return 'image';
    
    // Check explicit type field
    if (attachment.type === 'image') return 'image';
    
    // Check format field (if available)
    const format = attachment.format?.toLowerCase();
    if (format && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(format)) {
      return 'image';
    }
    
    // Check file extension from original filename
    const extension = getFileExtension(attachment.original_filename || attachment.name || '');
    if (extension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      return 'image';
    }
    
    return 'document'; // Default to document
  };

  // Helper function to get file icon based on type
  const getFileIcon = (attachment: IAttachment): string => {
    const fileType = getFileType(attachment);
    const extension = getFileExtension(attachment.original_filename || attachment.name || '');
    const format = attachment.format?.toLowerCase() || extension;
    
    if (fileType === 'image') {
      return '🖼️';
    }
    
    // Specific document type icons
    switch (format) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📋';
      default:
        return '📎';
    }
  };

  // FIXED: Simplified and more reliable file handling
  const handleFileAction = async (attachment: IAttachment, action: 'view' | 'download') => {
    console.log('File action:', action, 'for attachment:', attachment);

    // Get the best available URL
    const fileUrl = attachment.secure_url || attachment.url;
    
    if (!fileUrl) {
      message.error('File URL not available');
      return;
    }

    const fileName = attachment.original_filename || attachment.name || 'download';
    const fileType = getFileType(attachment);
    const format = attachment.format?.toLowerCase() || getFileExtension(fileName) || 'unknown';

    console.log(`${action} action for ${format} file:`, fileUrl);

    if (action === 'download') {
      try {
        // Create a temporary anchor element for download
        const link = document.createElement('a');
        
        // For Cloudinary URLs, ensure we force download
        let downloadUrl = fileUrl;
        if (fileUrl.includes('cloudinary.com')) {
          // Add fl_attachment flag to force download
          if (fileUrl.includes('/upload/')) {
            downloadUrl = fileUrl.replace('/upload/', '/upload/fl_attachment/');
          } else {
            downloadUrl = `${fileUrl}?fl_attachment`;
          }
        }
        
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Append to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        message.success('Download started');
        
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback: Open in new tab
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        message.info('File opened in new tab - you can save it manually');
      }
      return;
    }

    // VIEW ACTION
    if (action === 'view') {
      try {
        if (fileType === 'image') {
          // For images, just open directly
          const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            message.warning('Popup blocked. Please allow popups to view images.');
          }
          return;
        }

        // For documents, especially PDFs
        if (format === 'pdf') {
          // Try direct PDF viewing first
          const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            message.warning('Popup blocked. Please allow popups to view PDF.');
          }
        } else {
          // For other document types, try to open directly
          const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            message.warning('Cannot preview this file type. Trying download instead.');
            handleFileAction(attachment, 'download');
          }
        }
      } catch (error) {
        console.error('View failed:', error);
        message.warning('Cannot preview this file type. Trying download instead.');
        handleFileAction(attachment, 'download');
      }
    }
  };

  // Render attachment list with improved UI
  const renderAttachments = (attachments: IAttachment[]) => {
    if (!attachments || attachments.length === 0) {
      return <span className="text-gray-500 italic">No attachments</span>;
    }

    return (
      <div className="space-y-3">
        {attachments.map((attachment, index) => {
          const fileName = attachment.original_filename || attachment.name || `file-${index + 1}`;
          const fileSize = attachment.bytes ? `(${Math.round(attachment.bytes / 1024)} KB)` : '';
          const fileType = getFileType(attachment);
          const extension = getFileExtension(fileName);
          const displayFormat = attachment.format || extension || 'Unknown';
          const fileUrl = attachment.secure_url || attachment.url;
          
          return (
            <div 
              key={`${attachment.public_id || index}`}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getFileIcon(attachment)}</span>
                <div>
                  <div className="font-medium text-gray-900">{fileName}</div>
                  <div className="text-sm text-gray-500">
                    {displayFormat.toUpperCase()} {fileSize}
                    {fileType === 'image' && ' • Image'}
                    {fileType === 'document' && ' • Document'}
                  </div>
                  {/* Debug info in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-blue-500 mt-1 font-mono break-all">
                      URL: {fileUrl}
                    </div>
                  )}
                </div>
              </div>
              
              <Space size="small">
                <Button
                  type="default"
                  icon={fileType === 'image' ? <EyeOutlined /> : <FileOutlined />}
                  onClick={() => handleFileAction(attachment, 'view')}
                  title={fileType === 'image' ? 'Preview image' : 'Open file'}
                  className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-400"
                >
                  {fileType === 'image' ? 'Preview' : 'Open'}
                </Button>
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  onClick={() => handleFileAction(attachment, 'download')}
                  title="Download file"
                  className="text-green-600 hover:text-green-800 border-green-200 hover:border-green-400"
                >
                  Download
                </Button>
              </Space>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper function to get reviewer name with proper typing
  const getReviewerName = (reviewedBy: string | PopulatedUser | undefined): string => {
    if (!reviewedBy) return "System";
    if (typeof reviewedBy === 'string') return reviewedBy;
    return reviewedBy.name || "System";
  };

  if (!id) return <div>Invalid request</div>;
  if (!leaveRequest) return <div>Loading...</div>;

  const days = dayjs(leaveRequest.endDate).diff(dayjs(leaveRequest.startDate), "day") + 1;
  const attachments: IAttachment[] = leaveRequest.attachments ?? [];
  const canEditOrCancel = leaveRequest.status === "pending";
  const canDelete = true;

  return (
    <Card
      title="Leave Request Details"
      loading={loading}
      extra={
        <Button onClick={() => router.push("/dashboard/employee/my-leaves")}>
          Back to List
        </Button>
      }
    >
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label="Type">
          <span className="capitalize font-medium">
            {leaveRequest.type.charAt(0).toUpperCase() + leaveRequest.type.slice(1)}
          </span>
        </Descriptions.Item>

        <Descriptions.Item label="Dates">
          <span className="font-medium">
            {dayjs(leaveRequest.startDate).format("MMM D, YYYY")} — {dayjs(leaveRequest.endDate).format("MMM D, YYYY")}
          </span>
        </Descriptions.Item>

        <Descriptions.Item label="Duration">
          <span className="font-medium">
            {days} day{days !== 1 ? "s" : ""}
          </span>
        </Descriptions.Item>

        <Descriptions.Item label="Status">
          <Badge
            color={statusColors[leaveRequest.status]}
            text={
              <span className="font-medium">
                {leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
              </span>
            }
          />
        </Descriptions.Item>

        <Descriptions.Item label="Reason">
          <div className="whitespace-pre-wrap">{leaveRequest.reason}</div>
        </Descriptions.Item>

        <Descriptions.Item label="Attachments">
          {renderAttachments(attachments)}
        </Descriptions.Item>

        {(leaveRequest.reviewedBy || leaveRequest.reviewedAt) && (
          <Descriptions.Item label="Review Information">
            <div className="space-y-2">
              {leaveRequest.reviewedBy && (
                <div>
                  <strong>Reviewed By:</strong>{" "}
                  {getReviewerName(leaveRequest.reviewedBy as string | PopulatedUser)}
                </div>
              )}
              {leaveRequest.reviewedAt && (
                <div>
                  <strong>Reviewed At:</strong>{" "}
                  {dayjs(leaveRequest.reviewedAt).format("MMM D, YYYY h:mm A")}
                </div>
              )}
            </div>
          </Descriptions.Item>
        )}
      </Descriptions>

      <Divider />

      <div className="flex justify-end gap-2">
        {canEditOrCancel && (
          <>
            <Button 
              type="primary" 
              onClick={() => router.push(`/dashboard/employee/my-leaves/${id}/edit`)}
            >
              Edit Request
            </Button>
            <Popconfirm
              title="Cancel Leave Request"
              description="Are you sure you want to cancel this leave request?"
              onConfirm={() => handleAction("cancel")}
              okText="Yes, Cancel"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button danger loading={actionLoading}>
                Cancel Request
              </Button>
            </Popconfirm>
          </>
        )}

        {canDelete && (
          <Popconfirm
            title="Delete Leave Request"
            description="Are you sure you want to permanently delete this leave request? This action cannot be undone."
            onConfirm={() => handleAction("delete")}
            okText="Yes, Delete"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={actionLoading}>
              Delete Request
            </Button>
          </Popconfirm>
        )}
      </div>
    </Card>
  );
}