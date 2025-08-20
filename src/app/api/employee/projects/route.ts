// app/api/employee/projects/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { IApiResponse } from '@/types';

interface SessionUser {
  id: string;
  role: string;
  email?: string;
}
interface SessionData {
  user: SessionUser;
}

interface ProjectQuery {
  $or: Array<{ createdBy: string } | { 'teamMembers.userId': string }>;
  status?: string;
}

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionData | null;
    if (!session?.user || session.user.role !== 'employee') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Build query for projects where user is a team member or creator
    const query: ProjectQuery = {
      $or: [
        { createdBy: session.user.id },
        { 'teamMembers.userId': session.user.id },
      ],
    };
    if (status) query.status = status;

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('teamMembers.userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get stats for each project (for this employee only)
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskCount = await Task.countDocuments({
          project: project._id,
          assignedTo: session.user.id,
        });
        const completedTaskCount = await Task.countDocuments({
          project: project._id,
          assignedTo: session.user.id,
          status: 'completed',
        });
        const overdueTaskCount = await Task.countDocuments({
          project: project._id,
          assignedTo: session.user.id,
          dueDate: { $lt: new Date() },
          status: { $ne: 'completed' },
        });

        return {
          ...project.toObject(),
          taskCount,
          completedTaskCount,
          overdueTaskCount,
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
        total,
      },
      message: 'Projects fetched successfully',
    });

  } catch (error) {
    console.error('GET employee projects error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch projects',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
