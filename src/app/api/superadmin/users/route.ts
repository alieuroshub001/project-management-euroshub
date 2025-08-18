// app/api/superadmin/users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Verify superadmin access
    if (session?.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized access'
      }, { status: 403 });
    }

    await connectToDatabase();
    
    // Get all users except superadmin
    const users = await User.find({ role: { $ne: 'superadmin' } })
      .select('-password -verificationToken')
      .sort({ createdAt: -1 });

    return NextResponse.json<IApiResponse>({
      success: true,
      data: users,
      message: 'Users fetched successfully'
    });

  } catch (error) {
    console.error('GET users error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized access'
      }, { status: 403 });
    }

    const { userId, newRole } = await request.json();
    
    if (!userId || !newRole) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'userId and newRole are required'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Validate new role
    const validRoles = ['admin', 'hr', 'employee', 'client'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid role specified'
      }, { status: 400 });
    }

    // Prevent role changes for superadmin (though they shouldn't be in the list)
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (user.role === 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Cannot modify superadmin role'
      }, { status: 403 });
    }

    // Update user role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    ).select('-password -verificationToken');

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('PUT user role error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to update user role',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user.role !== 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Unauthorized access'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Prevent deletion of superadmin
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (user.role === 'superadmin') {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Cannot delete superadmin'
      }, { status: 403 });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userId)
      .select('-password -verificationToken');

    // Here you might want to add cleanup of related data
    // For example: await SomeOtherModel.deleteMany({ userId });

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser
    });

  } catch (error) {
    console.error('DELETE user error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}