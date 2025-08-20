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
    
    let stats;
    const today = new Date();
    
    switch (period) {
      case 'daily': {
        const targetDate = date ? new Date(date) : today;
        stats = await TimeTrackerSession.getDailyStats(employeeId, targetDate);
        break;
      }
      case 'weekly': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        stats = await TimeTrackerSession.getWeeklyStats(employeeId, startOfWeek);
        break;
      }
      case 'monthly': {
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        stats = await TimeTrackerSession.getMonthlyStats(employeeId, month, year);
        break;
      }
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid period'
        } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    return NextResponse.json({
        success: true,
        data: stats,
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

