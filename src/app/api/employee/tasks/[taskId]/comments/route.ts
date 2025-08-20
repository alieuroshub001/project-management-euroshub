// app/api/tasks/[taskId]/comments/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

// Get all comments for a task
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
      .populate('comments.user', 'name email');

    if (!task) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Task not found'
      }, { status: 404 });
    }

    // Check if user has access to this task
    const hasAccess = await Task.findOne({
      _id: params.taskId,
      $or: [
        { createdBy: session.user.id },
        { assignedTo: session.user.id }
      ]
    });

    if (!hasAccess && session.user.role !== 'superadmin' && session.user.role !== 'admin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this task'
      }, { status: 403 });
    }

    return NextResponse.json<IApiResponse>({
      success: true,
      data: task.comments || [],
      message: 'Comments fetched successfully'
    });

  } catch (error) {
    console.error('GET comments error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch comments',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add a comment to a task
export async function POST(
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

    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Comment content is required'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user has access to this task
    const hasAccess = await Task.findOne({
      _id: params.taskId,
      $or: [
        { createdBy: session.user.id },
        { assignedTo: session.user.id }
      ]
    });

    if (!hasAccess && session.user.role !== 'superadmin' && session.user.role !== 'admin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this task'
      }, { status: 403 });
    }

    const task = await Task.findByIdAndUpdate(
      params.taskId,
      {
        $push: {
          comments: {
            content: content.trim(),
            user: session.user.id
          }
        }
      },
      { new: true }
    ).populate('comments.user', 'name email');

    if (!task) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Task not found'
      }, { status: 404 });
    }

    return NextResponse.json<IApiResponse>({
      success: true,
      data: task.comments[task.comments.length - 1],
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('POST comment error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to add comment',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}