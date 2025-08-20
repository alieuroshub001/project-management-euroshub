// app/api/projects/[projectId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import User from '@/models/User';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

// Get project details
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

    const project = await Project.findById(params.projectId)
      .populate('createdBy', 'name email')
      .populate('teamMembers.userId', 'name email')
      .populate('client', 'name email');

    if (!project) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    // Get project stats
    const taskCount = await Task.countDocuments({ project: params.projectId });
    const completedTaskCount = await Task.countDocuments({ 
      project: params.projectId, 
      status: 'completed' 
    });
    const overdueTaskCount = await Task.countDocuments({ 
      project: params.projectId,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    // Get team member stats
    const teamMemberDetails = await Promise.all(
      project.teamMembers.map(async (member: any) => {
        const user = await User.findById(member.userId);
        const taskCount = await Task.countDocuments({ 
          project: params.projectId,
          assignedTo: member.userId
        });

        return {
          userId: member.userId,
          name: user?.name || 'Unknown',
          email: user?.email || '',
          role: member.role,
          taskCount
        };
      })
    );

    const projectWithStats = {
      ...project.toObject(),
      taskCount,
      completedTaskCount,
      overdueTaskCount,
      teamMemberDetails
    };

    return NextResponse.json<IApiResponse>({
      success: true,
      data: projectWithStats,
      message: 'Project fetched successfully'
    });

  } catch (error) {
    console.error('GET project error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch project',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Update project
export async function PUT(
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

    // Check if user is project creator or superadmin
    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    if (project.createdBy.toString() !== session.user.id && session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Only project creator or superadmin can update this project'
      }, { status: 403 });
    }

    const {
      name,
      description,
      status,
      priority,
      startDate,
      dueDate,
      teamMembers,
      client,
      budget,
      tags,
      progress
    } = await request.json();

    // Update project fields
    if (name) project.name = name;
    if (description) project.description = description;
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (startDate) project.startDate = new Date(startDate);
    if (dueDate) project.dueDate = new Date(dueDate);
    if (budget) project.budget = budget;
    if (tags) project.tags = tags;
    if (progress !== undefined) project.progress = progress;

    // Validate and update team members if provided
    if (teamMembers) {
      const validTeamMembers = [];
      for (const member of teamMembers) {
        if (isValidObjectId(member.userId)) {
          validTeamMembers.push({
            userId: member.userId,
            role: member.role || 'member'
          });
        }
      }
      project.teamMembers = validTeamMembers;
    }

    // Validate client if provided
    if (client) {
      if (isValidObjectId(client)) {
        project.client = client;
      } else {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'Invalid client ID'
        }, { status: 400 });
      }
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('createdBy', 'name email')
      .populate('teamMembers.userId', 'name email')
      .populate('client', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedProject,
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('PUT project error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to update project',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Delete project
export async function DELETE(
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

    // Check if user is project creator or superadmin
    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Project not found'
      }, { status: 404 });
    }

    if (project.createdBy.toString() !== session.user.id && session.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Only project creator or superadmin can delete this project'
      }, { status: 403 });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: params.projectId });

    // Delete the project
    await Project.findByIdAndDelete(params.projectId);

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Project and all associated tasks deleted successfully'
    });

  } catch (error) {
    console.error('DELETE project error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to delete project',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}