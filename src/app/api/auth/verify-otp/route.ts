import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifyOTP, hashPassword } from '@/lib/auth';
import User from '@/models/User';
import { IApiResponse } from '@/types';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { email, otp, type, newPassword } = await request.json();

    // Verify OTP first for both flows
    const verificationResult = await verifyOTP(email, otp, type);
    if (!verificationResult.isValid) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Invalid or expired OTP'
      }, { status: 400 });
    }

    // Use the reference email if available, otherwise use the provided email
    const targetEmail = verificationResult.referenceEmail || email;

    if (type === 'verification') {
      // Handle email verification
      const updatedUser = await User.findOneAndUpdate(
        { email: targetEmail },
        { emailVerified: true },
        { new: true }
      );
      
      if (!updatedUser) {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }
      
      return NextResponse.json<IApiResponse>({
        success: true,
        message: 'Email verified successfully. You can now login.'
      });
    } 
    else if (type === 'password-reset' && newPassword) {
      // Handle password reset
      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await User.findOneAndUpdate(
        { email: targetEmail },
        { password: hashedPassword },
        { new: true }
      );
      
      if (!updatedUser) {
        return NextResponse.json<IApiResponse>({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }
      
      return NextResponse.json<IApiResponse>({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      });
    }
    else {
      // For password reset flow when just verifying OTP without password yet
      return NextResponse.json<IApiResponse>({
        success: true,
        message: 'OTP verified successfully. Please set your new password.',
        data: { targetEmail }
      });
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json<IApiResponse>({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}