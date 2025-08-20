// app/api/employee/time-tracker/sessions/recent/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { TimeTrackerSession } from '@/models/TimeTracker';
import { ITimeTrackerApiResponse } from '@/types';

export async function GET(request: Request) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 5, 1), 50) : 5;

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        message: 'Employee ID is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }

    const sessions = await TimeTrackerSession.getEmployeeSessions(employeeId, limit);

    const data = sessions.map((s) => {
      const screenshotsCount = Array.isArray((s as any).screenshots) ? (s as any).screenshots.length : 0;
      const tasksCount = Array.isArray((s as any).tasksCompleted) ? (s as any).tasksCompleted.length : 0;
      const averageActivity = typeof (s as any).averageActivityLevel === 'number' ? (s as any).averageActivityLevel : 0;
      const project: any = (s as any).projectId || undefined;

      return {
        id: (s as any)._id?.toString?.() || (s as any).id,
        title: (s as any).title,
        startTime: (s as any).startTime,
        endTime: (s as any).endTime || undefined,
        // UI expects seconds for formatTime
        duration: ((s as any).durationMinutes || 0) * 60,
        status: (s as any).status === 'stopped' ? 'stopped' : ((s as any).endTime ? 'completed' : 'stopped'),
        screenshots: screenshotsCount,
        tasks: tasksCount,
        averageActivity,
        projectName: project && typeof project === 'object' ? project.name : undefined
      };
    });

    return NextResponse.json({
      success: true,
      message: '',
      data
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch recent sessions',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}

