import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import LeaveRequest from '@/models/LeaveRequest';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['hr', 'admin', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');

    if (!startDate || !endDate) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Start date and end date are required'
      }, { status: 400 });
    }

    const dateFilter = {
      startDate: { $gte: new Date(startDate) },
      endDate: { $lte: new Date(endDate) }
    };

    let employeeFilter = {};
    if (department && department !== 'all') {
      const users = await User.find({ department }).select('_id');
      employeeFilter = { employeeId: { $in: users.map(u => u._id) } };
    }

    // Get monthly leave statistics
    const stats = await LeaveRequest.aggregate([
      {
        $match: {
          ...dateFilter,
          ...employeeFilter
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$startDate' },
            status: '$status'
          },
          count: { $sum: 1 },
          totalDays: {
            $sum: {
              $divide: [
                { $subtract: ['$endDate', '$startDate'] },
                1000 * 60 * 60 * 24 // Convert milliseconds to days
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.month',
          data: {
            $push: {
              status: '$_id.status',
              count: '$count',
              totalDays: '$totalDays'
            }
          }
        }
      },
      {
        $project: {
          month: '$_id',
          data: 1,
          _id: 0
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    // Format the data for the chart
    const formattedStats = stats.map(monthData => {
      const result: any = { 
        month: new Date(2000, monthData.month - 1).toLocaleString('default', { month: 'short' }),
        approved: 0,
        pending: 0,
        rejected: 0
      };

      monthData.data.forEach((item: any) => {
        if (item.status === 'approved') {
          result.approved = Math.ceil(item.totalDays) + item.count; // Add 1 day per request
        } else if (item.status === 'pending') {
          result.pending = Math.ceil(item.totalDays) + item.count;
        } else if (item.status === 'rejected') {
          result.rejected = Math.ceil(item.totalDays) + item.count;
        }
      });

      return result;
    });

    return NextResponse.json<IApiResponse>({
      success: true,
      data: formattedStats,
      message: 'Leave statistics fetched successfully'
    });

  } catch (error) {
    console.error('GET leave stats error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch leave statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}