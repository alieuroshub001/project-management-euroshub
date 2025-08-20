// app/api/employee/time-tracker/sessions/route.ts
import { NextResponse } from 'next/server';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

// Start a new session
export async function POST(request: Request) {
  await connectToDatabase();
  
  try {
    const { employeeId, title, projectId, description } = await request.json();
    
    // Stop any existing active sessions
    await TimeTrackerSession.stopAllActiveSessions(employeeId);
    
    const newSession = await TimeTrackerSession.create({
      employeeId,
      title,
      projectId,
      description,
      status: 'running',
      startTime: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Session started successfully',
      data: newSession
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
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