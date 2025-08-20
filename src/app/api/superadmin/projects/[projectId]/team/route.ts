// app/api/projects/[projectId]/team/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import { IApiResponse } from '@/types';
import mongoose from 'mongoose';

// Helper function to validate ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
}

// Add or remove team members
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
        message: 'Only project creator or superadmin can modify team members'
      }, { status: 403 });
    }

    const { membersToAdd = [], membersToRemove = [] } = await request.json();

    // Validate members to add
    const validMembersToAdd = [];
    for (const member of membersToAdd) {
      if (isValidObjectId(member.userId)) {
        // Check if user is already a team member
        const isAlreadyMember = project.teamMembers.some((tm: any) => 
          tm.userId.toString() === member.userId
        );

        if (!isAlreadyMember) {
          validMembersToAdd.push({
            userId: member.userId,
            role: member.role || 'member'
          });
        }
      }
    }

    // Validate members to remove
    const validMembersToRemove = membersToRemove.filter((memberId: string) => 
      isValidObjectId(memberId)
    );

    // Add new members
    if (validMembersToAdd.length > 0) {
      project.teamMembers.push(...validMembersToAdd);
    }

    // Remove members (except the creator)
    if (validMembersToRemove.length > 0) {
      project.teamMembers = project.teamMembers.filter((member: any) => 
        !validMembersToRemove.includes(member.userId.toString()) && 
        member.userId.toString() !== project.createdBy.toString()
      );
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('teamMembers.userId', 'name email');

    return NextResponse.json<IApiResponse>({
      success: true,
      data: populatedProject,
      message: 'Team updated successfully'
    });

  } catch (error) {
    console.error('PUT team error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to update team',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}