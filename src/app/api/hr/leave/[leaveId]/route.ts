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

export async function GET(
  request: Request,
  { params }: { params: { leaveId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['hr', 'admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid leave request ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findById(params.leaveId)
      .populate('employeeId', 'name email department')
      .populate('reviewedBy', 'name email');

    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Leave request not found'
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

export async function PUT(
  request: Request,
  { params }: { params: { leaveId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['hr', 'admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.leaveId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid leave request ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findById(params.leaveId);
    if (!leaveRequest) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Leave request not found'
      }, { status: 404 });
    }

    const { action } = await request.json(); // 'approve' or 'reject'

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      }, { status: 400 });
    }

    // Update status based on action
    leaveRequest.status = action === 'approve' ? 'approved' : 'rejected';
    leaveRequest.reviewedBy = session.user.id;
    leaveRequest.reviewedAt = new Date();

    await leaveRequest.save();

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employeeId', 'name email department')
      .populate('reviewedBy', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedRequest,
      message: `Leave request ${action}d successfully`
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