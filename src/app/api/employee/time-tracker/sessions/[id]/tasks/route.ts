// app/api/employee/time-tracker/sessions/[id]/tasks/route.ts
import { NextResponse } from 'next/server';
import { TimeTrackerSession } from '@/models/TimeTracker';
import connectToDatabase from '@/lib/db';
import { ITimeTrackerApiResponse } from '@/types';

export async function POST(request: Request, context: any) {
  await connectToDatabase();
  
  try {
    const { params } = context || { params: { id: '' } };
    const sessionId = params.id;
    const { task } = await request.json();
    
    if (!task) {
      return NextResponse.json({
        success: false,
        message: 'Task data is required'
      } satisfies ITimeTrackerApiResponse, { status: 400 });
    }
    
    const newTask = {
      task: task.task,
      description: task.description,
      hoursSpent: task.hoursSpent,
      category: task.category || 'other',
      priority: task.priority || 'medium',
      projectId: task.projectId,
      tags: task.tags || []
    };
    
    // Update session with new task
    const updatedSession = await TimeTrackerSession.findByIdAndUpdate(
      sessionId,
      { $push: { tasksCompleted: newTask } },
      { new: true }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Task added successfully',
      data: updatedSession
    } satisfies ITimeTrackerApiResponse);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to add task',
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ITimeTrackerApiResponse, { status: 500 });
  }
}