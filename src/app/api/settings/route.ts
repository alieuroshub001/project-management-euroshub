// app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { TimeTrackerSettings } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

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
    
    const settings = await TimeTrackerSettings.findOne({ employeeId });
    
    return NextResponse.json({
        success: true,
        data: settings || {},
        message: ''
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to get settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}

export async function POST(request: Request) {
  await connectToDatabase();
  
  try {
    const { employeeId, ...settingsData } = await request.json();
    
    if (!employeeId) {
      return NextResponse.json({
        success: false,
        message: 'Employee ID is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    const settings = await TimeTrackerSettings.findOneAndUpdate(
      { employeeId },
      settingsData,
      { upsert: true, new: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      data: settings
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to save settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}