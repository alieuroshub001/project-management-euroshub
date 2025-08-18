// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function GET() {
  try {
    console.log('GET /api/users - Starting request');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    // Check authentication
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized access',
        data: []
      }, { status: 401 });
    }

    // Only allow specific roles
    const allowedRoles = ['superadmin', 'admin', 'employee', 'hr'];
    if (!allowedRoles.includes(session.user.role)) {
      console.log('Insufficient permissions, user role:', session.user.role);
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Insufficient permissions',
        data: []
      }, { status: 403 });
    }

    await connectToDatabase();
    console.log('Database connected');

    // Fetch users excluding the current user and optionally superadmin
    const currentUserEmail = session.user.email;
    const excludeRoles = session.user.role === 'superadmin' ? [] : ['superadmin'];
    
    const query: Record<string, unknown> = {};
    if (excludeRoles.length > 0) {
      query.role = { $nin: excludeRoles };
    }
    if (currentUserEmail) {
      query.email = { $ne: currentUserEmail };
    }

    console.log('Query:', query);

    const users = await User.find(query)
      .select('_id name email profileImage image role createdAt updatedAt')
      .sort({ name: 1 })
      .lean();

    console.log('Found users:', users?.length || 0);

    // Normalize user data
    const normalizedUsers = (users || []).map(user => ({
      _id: user._id?.toString() || '',
      name: user.name || 'Unknown User',
      email: user.email || '',
      profileImage: user.profileImage || user.image || null,
      role: user.role || 'employee',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    console.log('Normalized users:', normalizedUsers.length);

    return NextResponse.json<IApiResponse>({
      success: true,
      data: normalizedUsers,
      message: `${normalizedUsers.length} users fetched successfully`
    });

  } catch (error) {
    console.error('GET users error:', error);
    
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    }, { status: 500 });
  }
}