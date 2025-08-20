// app/api/employee/time-tracker/sessions/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

// Start a new session
export async function POST(request: Request) {
  await connectToDatabase();
  
  try {
    const { employeeId, title, projectId, description } = await request.json();

    // Validate required fields
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({
        success: false,
        message: 'Valid employeeId is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({
        success: false,
        message: 'Title is required and must be at least 3 characters'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    // Stop any existing active sessions
    await TimeTrackerSession.stopAllActiveSessions(employeeId);
    
    // Build create payload with safe types
    const createPayload: Record<string, unknown> = {
      employeeId,
      title: title.trim(),
      description: description ?? '',
      status: 'running',
      startTime: new Date()
    };

    // Only include projectId if it's a valid ObjectId
    if (projectId && typeof projectId === 'string' && mongoose.Types.ObjectId.isValid(projectId)) {
      createPayload.projectId = projectId;
    }

    const newSession = await TimeTrackerSession.create(createPayload);
    
    return NextResponse.json({
      success: true,
      message: 'Session started successfully',
      data: newSession
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    console.error('Error starting time tracker session:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to start session',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}

// Get active session
export async function GET(request: Request) {
  await connectToDatabase();
  
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        message: 'Employee ID is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    const activeSession = await TimeTrackerSession.getActiveSession(employeeId);
    
    return NextResponse.json({
        success: true,
        data: activeSession,
        message: ''
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get active session',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}