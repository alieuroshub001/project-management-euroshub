// app/api/employee/leave/[leaveId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import { IApiResponse } from '@/types';
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

// Get specific leave request details
export async function GET(
  request: Request,
  context: RouteParams
): Promise<NextResponse<IApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const params = await context.params;

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid leave request ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findOne({
      _id: params.leaveId,
      employeeId: session.user.id
    })
    .populate('employeeId', 'name email')
    .populate('reviewedBy', 'name email');

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Leave request not found or not yours'
      }, { status: 404 });
    }

    return NextResponse.json<IApiResponse>({
      success: true,
      data: leaveRequest,
      message: 'Leave request fetched successfully'
    });

  } catch (error) {
    console.error('GET leave request error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch leave request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update or cancel a leave request
export async function PUT(
  request: Request,
  context: RouteParams
): Promise<NextResponse<IApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const params = await context.params;

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid leave request ID'
      }, { status: 400 });
    }

    const { action, ...updateData } = await request.json();

    await connectToDatabase();

    // Handle update action
    if (action === 'update') {
      const leaveRequest = await LeaveRequest.findOne({
        _id: params.leaveId,
        employeeId: session.user.id,
        status: 'pending'
      });

      if (!leaveRequest) {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'Leave request not found, not yours, or cannot be edited'
        }, { status: 404 });
      }

      Object.assign(leaveRequest, {
        type: updateData.type,
        startDate: new Date(updateData.startDate),
        endDate: new Date(updateData.endDate),
        reason: updateData.reason,
        attachments: updateData.attachments || []
      });

      await leaveRequest.save();

      const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
        .populate('employeeId', 'name email')
        .populate('reviewedBy', 'name email');

      return NextResponse.json<IApiResponse>({
        success: true,
        data: populatedRequest,
        message: 'Leave request updated successfully'
      });
    }

    // Handle cancel action (default)
    const leaveRequest = await LeaveRequest.findOne({
      _id: params.leaveId,
      employeeId: session.user.id,
      status: 'pending'
    });

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Leave request not found, not yours, or cannot be cancelled'
      }, { status: 404 });
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
      message: 'Leave request cancelled successfully'
    });

  } catch (error) {
    console.error('PUT leave request error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to update leave request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete a leave request
export async function DELETE(
  request: Request,
  context: RouteParams
): Promise<NextResponse<IApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const params = await context.params;

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid leave request ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findOne({
      _id: params.leaveId,
      employeeId: session.user.id
    });

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Leave request not found or not yours'
      }, { status: 404 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Only pending leave requests can be deleted'
      }, { status: 400 });
    }

    await LeaveRequest.deleteOne({ _id: params.leaveId });

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Leave request deleted successfully'
    });

  } catch (error) {
    console.error('DELETE leave request error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to delete leave request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}