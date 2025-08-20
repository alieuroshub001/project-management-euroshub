import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import User from '@/models/User';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const employeeId = searchParams.get('employeeId');
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by type if provided
    if (type) {
      query.type = type;
    }

    // Filter by employee if provided
    if (employeeId) {
      if (isValidObjectId(employeeId)) {
        query.employeeId = employeeId;
      } else {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'Invalid employee ID'
        }, { status: 400 });
      }
    }

    // Date range filter
    if (startDate && endDate) {
      query.$or = [
        // Leaves that start within the range
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Leaves that end within the range
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Leaves that span the entire range
        { 
          $and: [
            { startDate: { $lte: new Date(startDate) } },
            { endDate: { $gte: new Date(endDate) } }
          ]
        }
      ];
    }

    // Search filter (employee name or email)
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      query.employeeId = { $in: users.map(u => u._id) };
    }

    // Department filter
    if (department && department !== 'all') {
      const users = await User.find({ department }).select('_id');
      query.employeeId = { $in: users.map(u => u._id) };
    }

    const leaveRequests = await LeaveRequest.find(query)
      .populate('employeeId', 'name email department')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LeaveRequest.countDocuments(query);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: {
        leaveRequests,
        page,
        limit,
        total
      },
      message: 'Leave requests fetched successfully'
    });

  } catch (error) {
    console.error('GET HR leave requests error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}