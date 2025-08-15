// app/api/employee/profile/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import type { IApiResponse, UserRole } from '@/types';

/** Minimal shape we read from the User model for building the profile */
type UserLike = {
  _id?: unknown; // ObjectId-ish
  id?: string;   // sometimes present from lean()/virtuals
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  profileImage?: string;
  employeeId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Same as above but with password available when we select it */
type UserWithPassword = UserLike & { password: string };

/** Safely convert various _id/id forms to a string */
function toIdString(u: Pick<UserLike, '_id' | 'id'>): string | undefined {
  if (typeof u.id === 'string' && u.id) return u.id;
  const anyId = u._id as unknown;
  if (
    anyId &&
    typeof anyId === 'object' &&
    'toString' in anyId &&
    typeof (anyId as { toString: () => string }).toString === 'function'
  ) {
    return (anyId as { toString: () => string }).toString();
  }
  return undefined;
}

/**
 * Shape the user response for the client
 */
function toProfile(user: UserLike) {
  return {
    id: toIdString(user) ?? '',
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? '',
    profileImage: user.profileImage ?? '',
    employeeId: user.employeeId ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * GET /api/employee/profile
 * Returns the logged-in user's profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // We don't need password here; default selection is fine
    const userDoc = (await User.findOne({ email: session.user.email })) as unknown as UserLike | null;
    if (!userDoc) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<IApiResponse>(
      {
        success: true,
        message: 'Profile fetched',
        data: toProfile(userDoc),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /employee/profile error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employee/profile
 * Updates name/phone/profileImage and (optionally) password
 * Admins can also update employeeId
 * Body: { name?, phone?, profileImage?, currentPassword?, newPassword?, employeeId? }
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      phone,
      profileImage,
      currentPassword,
      newPassword,
      employeeId,
    }: {
      name?: string;
      phone?: string;
      profileImage?: string;
      currentPassword?: string;
      newPassword?: string;
      employeeId?: string;
    } = body || {};

    await connectToDatabase();

    // Need password for comparison, so select it explicitly
    const userDoc = (await User.findOne({ email: session.user.email }).select(
      '+password'
    )) as unknown as (UserWithPassword & { save: () => Promise<void> }) | null;

    if (!userDoc) {
      return NextResponse.json<IApiResponse>(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow admin/superadmin to update employeeId
    if (employeeId !== undefined) {
      const role = session.user.role as UserRole | undefined;
      if (role !== 'superadmin' && role !== 'admin') {
        return NextResponse.json<IApiResponse>(
          { success: false, message: 'Unauthorized to update employee ID' },
          { status: 403 }
        );
      }
      userDoc.employeeId = employeeId;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json<IApiResponse>(
          { success: false, message: 'Current password required' },
          { status: 400 }
        );
      }

      const ok = await bcrypt.compare(currentPassword, userDoc.password);
      if (!ok) {
        return NextResponse.json<IApiResponse>(
          { success: false, message: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json<IApiResponse>(
          { success: false, message: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      userDoc.password = await bcrypt.hash(newPassword, 10);
    }

    // Basic fields
    if (typeof name === 'string') userDoc.name = name;
    if (typeof phone === 'string') userDoc.phone = phone;
    if (typeof profileImage === 'string') userDoc.profileImage = profileImage;

    await userDoc.save();

    return NextResponse.json<IApiResponse>(
      {
        success: true,
        message: 'Profile updated successfully',
        data: toProfile(userDoc),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /employee/profile error:', error);
    return NextResponse.json<IApiResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
