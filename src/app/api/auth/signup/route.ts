import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { createOTPRecord, hashPassword } from '@/lib/auth';
import User from '@/models/User';
import { IApiResponse } from '@/types';
import { Error as MongooseError } from 'mongoose';

const validRoles = ['superadmin', 'admin', 'hr', 'employee', 'client'] as const;
type Role = typeof validRoles[number];

interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { name, email, password, role = 'employee' } = (await request.json()) as SignupRequest;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'All fields are required'
      }, { status: 400 });
    }

    // Validate role
    if (!validRoles.includes(role)) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      }, { status: 400 });
    }

    // Validate email domain for employee/hr roles
    if (['employee', 'hr'].includes(role) && !email.endsWith('.euroshub@gmail.com')) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'Employee and HR must use company email addresses ending with .euroshub@gmail.com'
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json<IApiResponse>({
        success: false,
        message: 'User already exists'
      }, { status: 400 });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      emailVerified: false
    });

    // Determine where to send OTP
    let otpEmail = email;
    let otpMessage = 'Please check your email for verification OTP.';
    
    if (role === 'admin' || role === 'superadmin') {
      otpEmail = process.env.ADMIN_OTP_EMAIL || email;
      otpMessage = role === 'admin' 
        ? 'Admin verification OTP sent to system administrator.' 
        : 'Superadmin verification OTP sent to system administrator.';
    }

    // Generate and send OTP
    await createOTPRecord(otpEmail, 'verification', email); // Pass original email as reference

    return NextResponse.json<IApiResponse>({
      success: true,
      message: `User created. ${otpMessage}`,
      data: { 
        userId: newUser._id,
        role: newUser.role,
        verificationEmail: otpEmail,
        originalEmail: email
      }
    });

  } catch (error: unknown) {
    console.error('Signup error:', error);

    let errorMessage = 'Internal server error';

    if (error instanceof MongooseError.ValidationError) {
      errorMessage = Object.values(error.errors)
        .map((err: MongooseError.ValidatorError | MongooseError.CastError) => err.message)
        .join(', ');
    } else if (error instanceof Error && error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json<IApiResponse>({
      success: false,
      message: errorMessage,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
