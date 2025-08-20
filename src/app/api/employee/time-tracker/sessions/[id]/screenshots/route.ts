// app/api/employee/time-tracker/sessions/[id]/screenshots/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';
import { uploadToCloudinary } from '@/lib/cloudinary1';

export async function POST(request: Request, context: any) {
  await connectToDatabase();
  
  try {
    const { params } = context || { params: { id: '' } };
    const sessionId = params.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const activityData = JSON.parse(formData.get('activity') as string);
    
    if (!file || !activityData) {
      return NextResponse.json({
        success: false,
        message: 'File and activity data are required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: 'time_tracker_screenshots'
    });
    
    const screenshot = {
      url: uploadResult.secure_url,
      thumbnailUrl: uploadResult.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200/'),
      blurredUrl: uploadResult.secure_url.replace('/upload/', '/upload/e_blur:1000/'),
      public_id: uploadResult.public_id,
      timestamp: new Date(),
      intervalStart: new Date(activityData.intervalStart),
      intervalEnd: new Date(activityData.intervalEnd),
      activityLevel: activityData.activityLevel,
      keystrokes: activityData.keystrokes,
      mouseClicks: activityData.mouseClicks,
      activeWindowTitle: activityData.activeWindowTitle,
      activeApplicationName: activityData.activeApplicationName,
      isManualCapture: activityData.isManualCapture || false,
      isBlurred: false,
      isDeleted: false,
      width: uploadResult.width,
      height: uploadResult.height,
      fileSize: uploadResult.bytes
    };
    
    // Update session with new screenshot
    const updatedSession = await TimeTrackerSession.findByIdAndUpdate(
      sessionId,
      { $push: { screenshots: screenshot } },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Screenshot uploaded successfully',
      data: updatedSession
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to upload screenshot',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}