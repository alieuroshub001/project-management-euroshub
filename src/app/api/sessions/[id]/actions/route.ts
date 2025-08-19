// app/api/sessions/[id]/actions/route.ts
import { NextResponse } from 'next/server';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  
  try {
    const { action } = await request.json();
    const sessionId = params.id;
    
    const session = await TimeTrackerSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Session not found'
      } satisfies ITimeTrackerApiResponse, { status: 404 });
    }
    
    switch (action) {
      case 'stop':
        session.status = 'stopped';
        session.endTime = new Date();
        break;
      case 'pause':
        session.status = 'paused';
        break;
      case 'resume':
        session.status = 'running';
        break;
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    await session.save();
    
    return NextResponse.json({
      success: true,
      message: `Session ${action} successful`,
      data: session
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to perform session action',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}