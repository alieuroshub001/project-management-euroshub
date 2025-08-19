// app/api/work-diary/route.ts
import { NextResponse } from 'next/server';
import { WorkDiary } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

export async function GET(request: Request) {
  await connectToDatabase();
  
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        message: 'Employee ID is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    const query: any = { employeeId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const diaryEntries = await WorkDiary.find(query)
      .sort({ date: -1 })
      .populate('sessionId', 'title description startTime endTime');
    
    return NextResponse.json({
        success: true,
        data: diaryEntries,
        message: ''
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get work diary entries',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}