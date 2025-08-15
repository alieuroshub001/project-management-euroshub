// app/api/employee/attendance/route.ts - UPDATED VERSION with multiple check-ins and mandatory tasks
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import AttendanceRecord from '@/models/AttendanceRecord';
import connectToDatabase from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { AttendanceStatus, ShiftType } from '@/types';
import { FilterQuery } from 'mongoose';

// GET all attendance records for the current user with optional filters
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as AttendanceStatus;
    const isRemote = searchParams.get('isRemote');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query with proper typing
    const query: FilterQuery<typeof AttendanceRecord> = { employeeId: session.user.id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (isRemote !== null && isRemote !== undefined) {
      query.isRemote = isRemote === 'true';
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const records = await AttendanceRecord.find(query)
      .sort({ date: -1, checkIn: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalRecords = await AttendanceRecord.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);

    // Calculate summary statistics
    const stats = await AttendanceRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          remoteDays: { $sum: { $cond: ['$isRemote', 1, 0] } },
          totalHours: { $sum: '$totalHours' },
          avgHours: { $avg: '$totalHours' },
          totalBreakMinutes: { $sum: '$totalBreakMinutes' },
          totalNamazMinutes: { $sum: '$totalNamazMinutes' }
        }
      }
    ]);

    // Transform records to ensure proper IDs and format
    const transformedRecords = records.map(record => ({
      ...record,
      id: record._id.toString(),
      _id: undefined
    }));

    return NextResponse.json({
      data: transformedRecords,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: stats[0] || {}
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

// POST create a new attendance record (check-in) - UPDATED to always allow multiple check-ins
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      shift = 'flexible',
      checkInReason,
      location,
      deviceInfo,
      notes,
      forceCheckIn = false
    } = await request.json();
    
    console.log('POST request payload:', { shift, checkInReason, location, deviceInfo, notes, forceCheckIn });
    
    await connectToDatabase();

    // Check if there are existing records for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingRecords = await AttendanceRecord.find({
      employeeId: session.user.id,
      date: today,
    }).sort({ checkIn: -1 }).limit(1); // Get the most recent record

    const existingRecord = existingRecords[0];

    // If there's an existing record and user hasn't confirmed, return warning
    if (existingRecord && !forceCheckIn) {
      return NextResponse.json(
        { 
          error: 'already_checked_in',
          message: 'You have already checked in today. Do you want to check in again?',
          existingRecord: {
            ...existingRecord.toJSON(),
            id: existingRecord._id.toString()
          }
        },
        { status: 409 } // Conflict status
      );
    }

    const now = new Date();
    
    // Determine status based on shift and time
    let status: AttendanceStatus = 'present';
    if (shift === 'morning') {
      const checkInHour = now.getHours();
      status = checkInHour > 9 ? 'late' : 'present';
    }

    const recordData = {
      employeeId: session.user.id,
      date: today,
      checkIn: now,
      status,
      shift: shift as ShiftType,
      checkInReason: status === 'late' || existingRecord ? checkInReason : undefined,
      checkInLocation: location ? {
        type: 'Point' as const,
        coordinates: [location.longitude, location.latitude],
        address: location.address
      } : undefined,
      deviceInfo,
      notes
    };

    console.log('Creating record with data:', recordData);

    const createdRecord = await AttendanceRecord.create(recordData);
    console.log('Created record:', createdRecord);
    
    // Return the record with proper transformation
    const transformedRecord = {
      ...createdRecord.toJSON(),
      id: createdRecord._id.toString()
    };
    
    console.log('Transformed record:', transformedRecord);
    
    const message = existingRecord 
      ? `Additional check-in successful${status === 'late' ? ' (marked as late)' : ''}`
      : `Check-in successful${status === 'late' ? ' (marked as late)' : ''}`;
    
    return NextResponse.json({ 
      data: transformedRecord,
      message,
      isAdditionalCheckIn: !!existingRecord
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    );
  }
}

// PUT update attendance record (check-out, breaks, namaz, etc) - UPDATED to require tasks for checkout
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      action,
      checkOutReason,
      tasksCompleted,
      breakType,
      breakNotes,
      namazType,
      location,
      notes,
      recordId // Optional: specify which record to update if multiple exist
    } = await request.json();
    
    console.log('PUT request:', { action, checkOutReason, tasksCompleted, breakType, breakNotes, namazType, location, notes, recordId });
    
    await connectToDatabase();

    let record;
    
    if (recordId) {
      // Update specific record by ID
      record = await AttendanceRecord.findOne({
        _id: recordId,
        employeeId: session.user.id,
      });
    } else {
      // Find the most recent active record for today (existing behavior)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      record = await AttendanceRecord.findOne({
        employeeId: session.user.id,
        date: today,
        checkOut: { $exists: false } // Only get records without checkout
      }).sort({ checkIn: -1 }); // Get the latest active check-in for today
    }

    if (!record) {
      return NextResponse.json(
        { error: 'No active attendance record found. Please check in first.' },
        { status: 404 }
      );
    }

    const now = new Date();

    switch (action) {
      case 'checkout':
        if (record.checkOut) {
          return NextResponse.json(
            { error: 'Already checked out for this record' },
            { status: 400 }
          );
        }

        // MANDATORY TASKS VALIDATION
        if (!tasksCompleted || !Array.isArray(tasksCompleted) || tasksCompleted.length === 0) {
          return NextResponse.json(
            { 
              error: 'Tasks are required for checkout',
              message: 'You must add at least one task completed today before checking out.'
            },
            { status: 400 }
          );
        }

        // Validate each task has a name
        const invalidTasks = tasksCompleted.filter(task => !task.task || task.task.trim() === '');
        if (invalidTasks.length > 0) {
          return NextResponse.json(
            { 
              error: 'Invalid tasks',
              message: 'All tasks must have a valid task name.'
            },
            { status: 400 }
          );
        }

        // Optional: Validate task hours if provided
        const tasksWithInvalidHours = tasksCompleted.filter(task => 
          task.hoursSpent !== undefined && 
          (typeof task.hoursSpent !== 'number' || task.hoursSpent <= 0 || task.hoursSpent > 24)
        );
        if (tasksWithInvalidHours.length > 0) {
          return NextResponse.json(
            { 
              error: 'Invalid task hours',
              message: 'Task hours must be between 0.1 and 24 hours.'
            },
            { status: 400 }
          );
        }
        
        record.checkOut = now;
        record.checkOutReason = checkOutReason;
        record.tasksCompleted = tasksCompleted.map(task => ({
          task: task.task.trim(),
          description: task.description?.trim() || undefined,
          hoursSpent: typeof task.hoursSpent === 'number' && task.hoursSpent > 0 ? task.hoursSpent : undefined,
          projectId: task.projectId?.trim() || undefined
        }));
        
        record.checkOutLocation = location ? {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: location.address
        } : undefined;
        
        if (notes) record.notes = notes;
        break;

      case 'break-start':
        const ongoingBreak = record.breaks?.find(b => !b.end);
        if (ongoingBreak) {
          return NextResponse.json(
            { error: 'There is already an ongoing break' },
            { status: 400 }
          );
        }
        
        record.breaks = record.breaks || [];
        record.breaks.push({
          start: now,
          type: breakType || 'break',
          notes: breakNotes
        });
        break;

      case 'break-end':
        if (!record.breaks || record.breaks.length === 0) {
          return NextResponse.json(
            { error: 'No break to end' },
            { status: 400 }
          );
        }
        
        const lastBreak = record.breaks[record.breaks.length - 1];
        if (lastBreak.end) {
          return NextResponse.json(
            { error: 'Last break is already ended' },
            { status: 400 }
          );
        }
        
        lastBreak.end = now;
        break;

      case 'namaz-start':
        const ongoingNamaz = record.namaz?.find(n => !n.end);
        if (ongoingNamaz) {
          return NextResponse.json(
            { error: 'There is already an ongoing namaz' },
            { status: 400 }
          );
        }
        
        record.namaz = record.namaz || [];
        record.namaz.push({
          start: now,
          type: namazType
        });
        break;

      case 'namaz-end':
        if (!record.namaz || record.namaz.length === 0) {
          return NextResponse.json(
            { error: 'No namaz to end' },
            { status: 400 }
          );
        }
        
        const lastNamaz = record.namaz[record.namaz.length - 1];
        if (lastNamaz.end) {
          return NextResponse.json(
            { error: 'Last namaz is already ended' },
            { status: 400 }
          );
        }
        
        lastNamaz.end = now;
        break;

      case 'update-tasks':
        if (!tasksCompleted || !Array.isArray(tasksCompleted)) {
          return NextResponse.json(
            { error: 'Invalid tasks data' },
            { status: 400 }
          );
        }
        record.tasksCompleted = tasksCompleted;
        break;

      case 'update-notes':
        record.notes = notes;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await record.save();
    console.log('Updated record after save:', record);
    
    // Transform the record with proper ID
    const transformedRecord = {
      ...record.toJSON(),
      id: record._id.toString()
    };
    
    console.log('Transformed updated record:', transformedRecord);
    
    let message = 'Attendance updated successfully';
    switch (action) {
      case 'checkout':
        const taskCount = tasksCompleted?.length || 0;
        message = `Check-out successful with ${taskCount} task${taskCount !== 1 ? 's' : ''} recorded`;
        break;
      case 'break-start':
        message = 'Break started';
        break;
      case 'break-end':
        message = 'Break ended';
        break;
      case 'namaz-start':
        message = 'Prayer time started';
        break;
      case 'namaz-end':
        message = 'Prayer time ended';
        break;
    }

    return NextResponse.json({ 
      data: transformedRecord,
      message 
    });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance record' },
      { status: 500 }
    );
  }
}

// DELETE remove an attendance record (admin only or same day)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    
    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const record = await AttendanceRecord.findById(recordId);
    
    if (!record) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Check if user owns the record
    if (record.employeeId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this record' },
        { status: 403 }
      );
    }

    // Only allow deletion of today's record or if user is admin
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);

    const isToday = recordDate.getTime() === today.getTime();
    const isAdmin = ['admin', 'superadmin', 'hr'].includes(session.user.role);

    if (!isToday && !isAdmin) {
      return NextResponse.json(
        { error: 'Can only delete today\'s attendance record' },
        { status: 403 }
      );
    }

    await AttendanceRecord.findByIdAndDelete(recordId);

    return NextResponse.json({ 
      message: 'Attendance record deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}