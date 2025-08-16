import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import { IApiResponse } from '@/types';

interface SessionUser {
  id: string;
  role: string;
  email?: string;
}
interface SessionData {
  user: SessionUser;
}

interface LeaveQuery {
  employeeId: string;
  status?: string;
  type?: string;
}

interface CreateLeaveBody {
  type: string;
  startDate: string | Date;
  endDate: string | Date;
  reason: string;
  attachments?: string[]; // adjust if you store richer objects
}

// Get all leave requests for the employee
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Build query for the employee's leave requests
    const query: LeaveQuery = { employeeId: session.user.id };
    if (status) query.status = status;
    if (type) query.type = type;

    const leaveRequests = await LeaveRequest.find(query)
      .populate('reviewedBy', 'name email')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LeaveRequest.countDocuments(query);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: { leaveRequests, page, limit, total },
      message: 'Leave requests fetched successfully'
    });

  } catch (error) {
    console.error('GET employee leave requests error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create a new leave request
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const {
      type,
      startDate,
      endDate,
      reason,
      attachments
    } = (await request.json()) as CreateLeaveBody;

    if (!type || !startDate || !endDate || !reason) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Required fields: type, startDate, endDate, reason'
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Start date cannot be after end date'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Check for overlapping leave requests
    const overlappingLeave = await LeaveRequest.findOne({
      employeeId: session.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        // Existing leave starts during new leave
        { startDate: { $gte: start, $lte: end } },
        // Existing leave ends during new leave
        { endDate: { $gte: start, $lte: end } },
        // New leave spans existing leave
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    });

    if (overlappingLeave) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You already have an approved or pending leave request for this period'
      }, { status: 400 });
    }

    const leaveRequest = await LeaveRequest.create({
      employeeId: session.user.id,
      type,
      startDate: start,
      endDate: end,
      reason,
      status: 'pending',
      attachments: attachments ?? []
    });

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('employeeId', 'name email')
      .populate('reviewedBy', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedRequest,
      message: 'Leave request created successfully'
    });

  } catch (error) {
    console.error('POST leave request error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to create leave request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
