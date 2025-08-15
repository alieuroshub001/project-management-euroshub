// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifyOTP, hashPassword } from '@/lib/auth';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email, otp, newPassword } = await request.json();

    const isValid = await verifyOTP(email, otp, 'password-reset');
    if (!isValid) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid or expired OTP'
      }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await User.findOneAndUpdate(
      { email },
      { password: hashedPassword }
    );

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}