// app/api/projects/[projectId]/stats/route.ts
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

// Get project statistics
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

    // Get task status distribution
    const statusDistribution = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(params.projectId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get task priority distribution
    const priorityDistribution = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(params.projectId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get completion trend (tasks completed by day)
    const completionTrend = await Task.aggregate([
      { 
        $match: { 
          project: new mongoose.Types.ObjectId(params.projectId),
          status: 'completed' 
        } 
      },
      { 
        $group: { 
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } 
          }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    // Get estimated vs actual hours
    const hoursComparison = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(params.projectId) } },
      { 
        $group: { 
          _id: null,
          totalEstimated: { $sum: '$estimatedHours' },
          totalActual: { $sum: '$actualHours' }
        } 
      }
    ]);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: {
        statusDistribution,
        priorityDistribution,
        completionTrend,
        hoursComparison: hoursComparison[0] || { totalEstimated: 0, totalActual: 0 }
      },
      message: 'Project statistics fetched successfully'
    });

  } catch (error) {
    console.error('GET project stats error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch project statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}