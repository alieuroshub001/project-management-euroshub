import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { createOTPRecord } from '@/lib/auth';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email } = await request.json();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Email not found',
        data: { emailExists: false }
      }, { status: 200 });
    }

    // Generate and send OTP - for password reset, we always send to the user's email
    await createOTPRecord(email, 'password-reset', email);

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Password reset OTP sent to your email',
      data: { emailExists: true }
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
