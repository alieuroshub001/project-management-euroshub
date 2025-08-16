// app/api/employee/leave/[leaveId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import { IApiResponse, IAttachment } from '@/types';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

interface RouteParams {
  params: Promise<{
    leaveId: string;
  }>;
}

interface SessionUser {
  id: string;
  role: string;
  email?: string;
}

interface SessionData {
  user: SessionUser;
}

interface UpdateLeaveBody {
  action?: 'update' | 'cancel';
  type?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  reason?: string;
  attachments?: IAttachment[];
}

// Validation function for attachments (typed safely)
function validateAttachments(attachments: unknown[]): IAttachment[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((att): att is Record<string, unknown> => !!att && typeof att === 'object')
    .map((att) => {
      const url = String(att.url ?? att.secure_url ?? '');
      const secure_url = String(att.secure_url ?? att.url ?? '');
      const public_id = String(att.public_id ?? '');
      const name = String(att.name ?? att.original_filename ?? 'Unknown file');
      const original_filename = String(att.original_filename ?? att.name ?? 'Unknown file');
      const format = String(att.format ?? 'unknown');
      const bytes = Number(att.bytes ?? 0);
      const type =
        typeof att.type === 'string' &&
        ['image', 'video', 'audio', 'document'].includes(att.type)
          ? (att.type as IAttachment['type'])
          : 'document';
      const resource_type = String(att.resource_type ?? 'raw');

      return {
        url,
        secure_url,
        public_id,
        name,
        original_filename,
        format,
        bytes,
        type,
        resource_type,
      };
    })
    .filter((att) => att.url || att.secure_url);
}

// ============================
// Get specific leave request
// ============================
export async function GET(
  request: Request,
  context: RouteParams
): Promise<NextResponse<IApiResponse>> {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid leave request ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findOne({
      _id: params.leaveId,
      employeeId: session.user.id,
    })
      .populate('employeeId', 'name email')
      .populate('reviewedBy', 'name email');

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Leave request not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json<IApiResponse>({
      success: true,
      data: leaveRequest,
      message: 'Leave request fetched successfully',
    });
  } catch (error) {
    console.error('GET leave request error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to fetch leave request',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================
// Update or cancel leave request
// ============================
export async function PUT(
  request: Request,
  context: RouteParams
): Promise<NextResponse<IApiResponse>> {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid leave request ID' },
        { status: 400 }
      );
    }

    const { action, ...updateData } = (await request.json()) as UpdateLeaveBody;

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findOne({
      _id: params.leaveId,
      employeeId: session.user.id,
    });

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Leave request not found or access denied' },
        { status: 404 }
      );
    }

    if (action === 'update') {
      if (leaveRequest.status !== 'pending') {
        return NextResponse.json<IApiResponse>(
          { success: false, message: 'Only pending leave requests can be updated' },
          { status: 400 }
        );
      }

      if (!updateData.type || !updateData.startDate || !updateData.endDate || !updateData.reason) {
        return NextResponse.json<IApiResponse>(
          {
            success: false,
            message: 'Required fields: type, startDate, endDate, reason',
          },
          { status: 400 }
        );
      }

      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);

      if (startDate > endDate) {
        return NextResponse.json<IApiResponse>(
          { success: false, message: 'Start date cannot be after end date' },
          { status: 400 }
        );
      }

      const overlappingLeave = await LeaveRequest.findOne({
        _id: { $ne: params.leaveId },
        employeeId: session.user.id,
        status: { $in: ['pending', 'approved'] },
        $or: [
          { startDate: { $gte: startDate, $lte: endDate } },
          { endDate: { $gte: startDate, $lte: endDate } },
          { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
        ],
      });

      if (overlappingLeave) {
        return NextResponse.json<IApiResponse>(
          {
            success: false,
            message: 'You already have an approved or pending leave request for this period',
          },
          { status: 400 }
        );
      }

      const validatedAttachments = validateAttachments(updateData.attachments ?? []);

      Object.assign(leaveRequest, {
        type: updateData.type,
        startDate,
        endDate,
        reason: updateData.reason.trim(),
        attachments: validatedAttachments,
      });

      await leaveRequest.save();

      const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
        .populate('employeeId', 'name email')
        .populate('reviewedBy', 'name email');

      return NextResponse.json<IApiResponse>({
        success: true,
        data: populatedRequest,
        message: 'Leave request updated successfully',
      });
    }

    // Cancel
    if (leaveRequest.status !== 'pending' && leaveRequest.status !== 'approved') {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Only pending or approved leave requests can be cancelled' },
        { status: 400 }
      );
    }

    leaveRequest.status = 'cancelled';
    leaveRequest.reviewedBy = session.user.id;
    leaveRequest.reviewedAt = new Date();
    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employeeId', 'name email')
      .populate('reviewedBy', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedRequest,
      message: 'Leave request cancelled successfully',
    });
  } catch (error) {
    console.error('PUT leave request error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to update leave request',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================
// Delete leave request
// ============================
export async function DELETE(
  request: Request,
  context: RouteParams
): Promise<NextResponse<IApiResponse>> {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid leave request ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findOne({
      _id: params.leaveId,
      employeeId: session.user.id,
    });

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Leave request not found or access denied' },
        { status: 404 }
      );
    }

    if (leaveRequest.status === 'approved') {
      return NextResponse.json<IApiResponse>(
        {
          success: false,
          message: 'Approved leave requests cannot be deleted. Please cancel instead.',
        },
        { status: 400 }
      );
    }

    if (leaveRequest.attachments?.length) {
      console.log(`Deleting leave request with ${leaveRequest.attachments.length} attachments`);
      // optional: Cloudinary cleanup
    }

    await LeaveRequest.deleteOne({ _id: params.leaveId });

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Leave request deleted successfully',
    });
  } catch (error) {
    console.error('DELETE leave request error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to delete leave request',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
