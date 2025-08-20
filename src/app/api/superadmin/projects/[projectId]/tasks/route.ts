// app/api/projects/[projectId]/tasks/route.ts
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

// Get all tasks for a project
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    // Check if user has access to this project
    const hasAccess = await Project.findOne({
      _id: params.projectId,
      $or: [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id }
      ]
    });

    if (!hasAccess && session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this project'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { project: params.projectId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (assignedTo) {
      if (assignedTo === 'me') {
        query.assignedTo = session.user.id;
      } else if (isValidObjectId(assignedTo)) {
        query.assignedTo = assignedTo;
      }
    }

    if (search) {
      query.$text = { $search: search };
    }

    const tasks = await Task.find(query)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1, priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Task.countDocuments(query);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: {
        tasks,
        page,
        limit,
        total
      },
      message: 'Tasks fetched successfully'
    });

  } catch (error) {
    console.error('GET tasks error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch tasks',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create a new task for the project
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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

    // Check if user has access to this project
    const project = await Project.findOne({
      _id: params.projectId,
      $or: [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id }
      ]
    });

    if (!project && session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'You do not have access to this project'
      }, { status: 403 });
    }

    const {
      title,
      description,
      status = 'todo',
      priority = 'medium',
      dueDate,
      assignedTo,
      estimatedHours,
      dependencies = []
    } = await request.json();

    if (!title) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Task title is required'
      }, { status: 400 });
    }

    // Validate assignedTo if provided
    if (assignedTo && !isValidObjectId(assignedTo)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid assignedTo user ID'
      }, { status: 400 });
    }

    // Validate dependencies
    const validDependencies = [];
    for (const depId of dependencies) {
      if (isValidObjectId(depId)) {
        validDependencies.push(depId);
      }
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      project: params.projectId,
      assignedTo: assignedTo || undefined,
      createdBy: session.user.id,
      estimatedHours,
      dependencies: validDependencies
    });

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedTask,
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('POST task error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to create task',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}