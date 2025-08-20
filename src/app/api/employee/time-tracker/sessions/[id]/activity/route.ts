// app/api/employee/time-tracker/sessions/[id]/activity/route.ts
import { NextResponse } from 'next/server';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

export async function POST(request: Request, context: any) {
  await connectToDatabase();
  
  try {
    const { params } = context || { params: { id: '' } };
    const sessionId = params.id;
    const { activity } = await request.json();
    
    if (!activity) {
      return NextResponse.json({
        success: false,
        message: 'Activity data is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    const activityLevel = {
      timestamp: new Date(activity.timestamp),
      keystrokes: activity.keystrokes,
      mouseClicks: activity.mouseClicks,
      mouseMoves: activity.mouseMoves,
      scrolls: activity.scrolls,
      activeWindowTitle: activity.activeWindowTitle,
      activeApplicationName: activity.activeApplicationName,
      productivityScore: activity.productivityScore,
      isIdle: activity.isIdle,
      intervalMinutes: activity.intervalMinutes || 10
    };
    
    // Update session with new activity
    const updatedSession = await TimeTrackerSession.findByIdAndUpdate(
      sessionId,
      { 
        $push: { activityLevels: activityLevel },
        $inc: { 
          totalKeystrokes: activity.keystrokes,
          totalMouseClicks: activity.mouseClicks
        },
        lastActive: new Date()
      },
      { new: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Activity updated successfully',
      data: updatedSession
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to update activity',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}