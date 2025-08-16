// app/api/employee/leave/route.ts - FINAL FIXED VERSION
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import { IApiResponse, IAttachment } from '@/types';
import mongoose from 'mongoose';

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
  attachments?: IAttachment[];
}

// ============================
// GET all leave requests
// ============================
export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

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
      message: 'Leave requests fetched successfully',
    });
  } catch (error) {
    console.error('GET employee leave requests error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to fetch leave requests',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================
// Attachment validator
// ============================
function validateAndCleanAttachments(attachments: unknown[]): IAttachment[] {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((att): att is Record<string, unknown> => !!att && typeof att === 'object')
    .map((att, index) => {
      const url = String(att.url ?? att.secure_url ?? '');
      const secure_url = String(att.secure_url ?? att.url ?? '');
      const public_id = String(att.public_id ?? '');
      const name = String(att.name ?? att.original_filename ?? `file-${index + 1}`);
      const original_filename = String(att.original_filename ?? att.name ?? `file-${index + 1}`);
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
    .filter((att) => att.url && att.secure_url);
}

// ============================
// POST create new leave
// ============================
export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateLeaveBody = await request.json();

    const { type, startDate, endDate, reason, attachments } = body;

    if (!type || !startDate || !endDate || !reason) {
      return NextResponse.json<IApiResponse>(
        {
          success: false,
          message: 'Required fields: type, startDate, endDate, reason',
        },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Start date cannot be after end date' },
        { status: 400 }
      );
    }

    const validTypes = ['vacation', 'sick', 'personal', 'bereavement', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Invalid leave type' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const validatedAttachments = validateAndCleanAttachments(attachments ?? []);

    const overlappingLeave = await LeaveRequest.findOne({
      employeeId: session.user.id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } },
        { startDate: { $lte: start }, endDate: { $gte: end } },
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

    try {
      const result = await LeaveRequest.collection.insertOne({
        employeeId: new mongoose.Types.ObjectId(session.user.id),
        type,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        status: 'pending',
        attachments: validatedAttachments,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const leaveRequest = await LeaveRequest.findById(result.insertedId)
        .populate('employeeId', 'name email')
        .populate('reviewedBy', 'name email');

      return NextResponse.json<IApiResponse>({
        success: true,
        data: leaveRequest,
        message: 'Leave request created successfully',
      });
    } catch (insertError) {
      console.error('Direct insertion failed:', insertError);

      const leaveRequestWithoutAttachments = await LeaveRequest.create({
        employeeId: session.user.id,
        type,
        startDate: start,
        endDate: end,
        reason: reason.trim(),
        status: 'pending',
      });

      if (validatedAttachments.length > 0) {
        leaveRequestWithoutAttachments.attachments = validatedAttachments;
        await leaveRequestWithoutAttachments.save();
      }

      const populatedRequest = await LeaveRequest.findById(
        leaveRequestWithoutAttachments._id
      )
        .populate('employeeId', 'name email')
        .populate('reviewedBy', 'name email');

      return NextResponse.json<IApiResponse>({
        success: true,
        data: populatedRequest,
        message: 'Leave request created successfully (fallback)',
      });
    }
  } catch (error) {
    console.error('POST leave request error:', error);

    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        const validationErrors = (error as mongoose.Error.ValidationError).errors ?? {};
        const errorMessages = Object.keys(validationErrors)
          .map((key) => `${key}: ${validationErrors[key].message}`)
          .join(', ');

        return NextResponse.json<IApiResponse>(
          {
            success: false,
            message: `Validation failed: ${errorMessages}`,
            error: error.message,
          },
          { status: 400 }
        );
      }

      if (error.message.includes('Cast to') && error.message.includes('failed')) {
        return NextResponse.json<IApiResponse>(
          {
            success: false,
            message: 'Invalid data format provided',
            error: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Failed to create leave request',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
