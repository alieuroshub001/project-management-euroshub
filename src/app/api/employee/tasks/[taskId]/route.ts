// app/api/tasks/[taskId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';
import Project from '@/models/Project';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

// Get task details
export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.taskId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid task ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    const task = await Task.findById(params.taskId)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('dependencies', 'title status');

    if (!task) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Task not found'
      }, { status: 404 });
    }

    // Check if user has access to this task's project
    const hasAccess = await Project.findOne({
      _id: task.project,
      $or: [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id }
      ]
    });

    if (!hasAccess && session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this task'
      }, { status: 403 });
    }

    return NextResponse.json<IApiResponse>({
      success: true,
      data: task,
      message: 'Task fetched successfully'
    });

  } catch (error) {
    console.error('GET task error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update task
export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.taskId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid task ID'
      }, { status: 400 });
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      estimatedHours,
      actualHours
    } = await request.json();

    await connectToDatabase();

    const task = await Task.findById(params.taskId);

    if (!task) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Task not found'
      }, { status: 404 });
    }

    // Check if user has access to update this task
    const hasAccess = await Project.findOne({
      _id: task.project,
      $or: [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id }
      ]
    });

    if (!hasAccess && session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to update this task'
      }, { status: 403 });
    }

    // Update task fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (assignedTo) {
      if (isValidObjectId(assignedTo)) {
        task.assignedTo = assignedTo;
      } else {
        task.assignedTo = undefined;
      }
    }
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;

    // If task is being marked as completed, set completedAt
    if (status === 'completed' && task.status !== 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    // Update project progress
    await updateProjectProgress(task.project);

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('dependencies', 'title status');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('PUT task error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to update task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete task
export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (!isValidObjectId(params.taskId)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid task ID'
      }, { status: 400 });
    }

    await connectToDatabase();

    const task = await Task.findById(params.taskId);

    if (!task) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Task not found'
      }, { status: 404 });
    }

    // Check if user is task creator, project creator or superadmin
    const project = await Project.findById(task.project);
    if (!project) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    if (
      task.createdBy.toString() !== session.user.id && 
      project.createdBy.toString() !== session.user.id && 
      session.user.role !== 'superadmin'
    ) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have permission to delete this task'
      }, { status: 403 });
    }

    // Delete the task
    await Task.findByIdAndDelete(params.taskId);

    // Update project progress
    await updateProjectProgress(task.project);

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('DELETE task error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to delete task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to update project progress
async function updateProjectProgress(projectId: string) {
  const totalTasks = await Task.countDocuments({ project: projectId });
  const completedTasks = await Task.countDocuments({ 
    project: projectId, 
    status: 'completed' 
  });

  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  await Project.findByIdAndUpdate(projectId, { 
    progress,
    updatedAt: new Date()
  });
}