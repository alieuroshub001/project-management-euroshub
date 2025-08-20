// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

// Get all projects (with optional filtering)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by priority if provided
    if (priority) {
      query.priority = priority;
    }

    // Text search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // For non-superadmins, only show projects they're part of
    if (session.user.role !== 'superadmin') {
      query.$or = [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id }
      ];
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('teamMembers.userId', 'name email')
      .populate('client', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({ project: project._id });
        const completedTaskCount = await Task.countDocuments({ 
          project: project._id, 
          status: 'completed' 
        });
        const overdueTaskCount = await Task.countDocuments({ 
          project: project._id,
          dueDate: { $lt: new Date() },
          status: { $ne: 'completed' }
        });

        return {
          ...project.toObject(),
          taskCount,
          completedTaskCount,
          overdueTaskCount
        };
      })
    );

    const total = await Project.countDocuments(query);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: {
        projects: projectsWithStats,
        page,
        limit,
        total
      },
      message: 'Projects fetched successfully'
    });

  } catch (error) {
    console.error('GET projects error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create a new project
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Only superadmins can create projects'
      }, { status: 403 });
    }

    const {
      name,
      description,
      status = 'not_started',
      priority = 'medium',
      startDate,
      dueDate,
      teamMembers = [],
      client,
      budget,
      tags = []
    } = await request.json();

    if (!name) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Project name is required'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Validate team members
    const validTeamMembers = [];
    for (const member of teamMembers) {
      if (isValidObjectId(member.userId)) {
        validTeamMembers.push({
          userId: member.userId,
          role: member.role || 'member'
        });
      }
    }

    // Validate client if provided
    if (client && !isValidObjectId(client)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid client ID'
      }, { status: 400 });
    }

    const project = await Project.create({
      name,
      description,
      status,
      priority,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: session.user.id,
      teamMembers: validTeamMembers,
      client: client || undefined,
      budget,
      tags,
      progress: 0
    });

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('teamMembers.userId', 'name email')
      .populate('client', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedProject,
      message: 'Project created successfully'
    });

  } catch (error) {
    console.error('POST project error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to create project',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}