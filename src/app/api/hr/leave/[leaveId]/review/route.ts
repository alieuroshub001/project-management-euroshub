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

export async function POST(
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

    const { comment } = await request.json();

    if (!comment || typeof comment !== 'string') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Comment is required'
      }, { status: 400 });
    }

    await connectToDatabase();

    const leaveRequest = await LeaveRequest.findByIdAndUpdate(
      params.leaveId,
      {
        reviewerComment: comment,
        reviewedBy: session.user.id,
        reviewedAt: new Date()
      },
      { new: true }
    )
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
      message: 'Review comment added successfully'
    });

  } catch (error) {
    console.error('POST leave review error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to add review comment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}