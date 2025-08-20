// app/api/employee/time-tracker/stats/route.ts
import { NextResponse } from 'next/server';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

export async function GET(request: Request) {
  await connectToDatabase();
  
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const period = searchParams.get('period') || 'daily';
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        message: 'Employee ID is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    const today = new Date();

    // Build a combined stats object matching MyTimeTrackingPage expectations
    // todayStats
    const targetDate = date ? new Date(date) : today;
    const [daily] = await TimeTrackerSession.getDailyStats(employeeId, targetDate);

    // weekStats
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const weekly = await TimeTrackerSession.getWeeklyStats(employeeId, startOfWeek);
    const weeklyTotals = weekly.reduce(
      (acc: { totalMinutes: number; totalSessions: number; averageActivitySum: number }, d: any) => {
        const dayHours = d.totalHours || 0;
        const daySessions = d.totalSessions || 0;
        const dayAvg = typeof d.averageActivity === 'number' ? d.averageActivity : 0;
        return {
          totalMinutes: acc.totalMinutes + Math.round(dayHours * 60),
          totalSessions: acc.totalSessions + daySessions,
          averageActivitySum: acc.averageActivitySum + dayAvg
        };
      },
      { totalMinutes: 0, totalSessions: 0, averageActivitySum: 0 }
    );

    const weekStats = {
      totalMinutes: weeklyTotals.totalMinutes,
      averageActivity: weekly.length ? Math.round(weeklyTotals.averageActivitySum / weekly.length) : 0,
      totalSessions: weeklyTotals.totalSessions,
      completedTasks: 0
    };

    // monthStats
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const monthly = await TimeTrackerSession.getMonthlyStats(employeeId, month, year);
    const monthTotalHours = monthly.reduce((acc: number, d: any) => acc + (d.totalHours || 0), 0);
    const monthTotalSessions = monthly.reduce((acc: number, d: any) => acc + (d.totalSessions || 0), 0);
    const monthAvgActivity = monthly.length
      ? Math.round(
          monthly.reduce((acc: number, d: any) => acc + (typeof d.averageActivity === 'number' ? d.averageActivity : 0), 0) /
            monthly.length
        )
      : 0;

    const monthStats = {
      totalHours: parseFloat(monthTotalHours.toFixed(2)),
      totalSessions: monthTotalSessions,
      averageSessionDuration: monthTotalSessions ? (monthTotalHours * 60) / monthTotalSessions : 0,
      productivityScore: monthAvgActivity
    };

    const todayStats = {
      totalMinutes: Math.round((daily?.totalHours || 0) * 60),
      activeMinutes: Math.round((daily?.productiveHours || 0) * 60),
      pausedMinutes: Math.max(0, Math.round(((daily?.totalHours || 0) - (daily?.productiveHours || 0)) * 60)),
      screenshots: daily?.totalScreenshots || 0,
      tasks: typeof (daily as any)?.tasksCompleted === 'number' ? (daily as any).tasksCompleted : 0,
      averageActivity: typeof daily?.averageActivity === 'number' ? Math.round(daily.averageActivity) : 0
    };

    const combined = { todayStats, weekStats, monthStats };

    return NextResponse.json({
      success: true,
      data: combined,
      message: ''
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}

