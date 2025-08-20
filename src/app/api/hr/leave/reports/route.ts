import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['hr', 'admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    if (!startDate || !endDate) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Start date and end date are required'
      }, { status: 400 });
    }

    const dateFilter = {
      $or: [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { 
          $and: [
            { startDate: { $lte: new Date(startDate) } },
            { endDate: { $gte: new Date(endDate) } }
          ]
        }
      ]
    };

    let employeeFilter = {};
    if (department && department !== 'all') {
      const users = await User.find({ department }).select('_id');
      employeeFilter = { employeeId: { $in: users.map(u => u._id) } };
    }

    let statusFilter = {};
    if (status && status !== 'all') {
      statusFilter = { status };
    }

    const leaveRequests = await LeaveRequest.find({
      ...dateFilter,
      ...employeeFilter,
      ...statusFilter
    })
      .populate({
        path: 'employeeId',
        select: 'name email department',
        model: 'User'
      })
      .populate('reviewedBy', 'name email')
      .sort({ startDate: 1 });

    return NextResponse.json<IApiResponse>({
      success: true,
      data: leaveRequests,
      message: 'Leave report data fetched successfully'
    });

  } catch (error) {
    console.error('GET leave reports error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch leave report data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}