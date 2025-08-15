import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/email';
import { IApiResponse } from '@/types';
import { generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email } = await request.json();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Email already verified'
      }, { status: 400 });
    }

    // Generate a new verification token if one doesn't exist
    if (!user.verificationToken) {
      user.verificationToken = generateToken();
      await user.save();
    }

    // Send verification email
    const emailResponse = await sendVerificationEmail(email, user.verificationToken);
    
    if (!emailResponse.success) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Failed to send verification email',
        error: emailResponse.error
      }, { status: 500 });
    }

    return NextResponse.json<IApiResponse>({
      success: true,
      message: 'Verification email sent'
    });

  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}