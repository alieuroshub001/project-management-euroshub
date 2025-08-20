// app/api/employee/projects/[projectId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.projectId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid project ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user is a team member of this project
    const project = await Project.findOne({
      _id: params.projectId,
      $or: [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('teamMembers.userId', 'name email');

    if (!project) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Project not found or you are not a team member'
      }, { status: 404 });
    }

    // Get task stats for the employee
    const taskCount = await Task.countDocuments({ 
      project: params.projectId,
      assignedTo: session.user.id
    });
    const completedTaskCount = await Task.countDocuments({ 
      project: params.projectId,
      assignedTo: session.user.id,
      status: 'completed' 
    });
    const overdueTaskCount = await Task.countDocuments({ 
      project: params.projectId,
      assignedTo: session.user.id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    const projectWithStats = {
      ...project.toObject(),
      taskCount,
      completedTaskCount,
      overdueTaskCount
    };

    return NextResponse.json<IApiResponse>({
      success: true,
      data: projectWithStats,
      message: 'Project fetched successfully'
    });

  } catch (error) {
    console.error('GET employee project error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch project',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}