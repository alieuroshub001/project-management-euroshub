// lib/auth.ts
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { IOTP } from '@/types';
import { sendOTPEmail } from './email';
import NextAuth, { SessionStrategy, User as NextAuthUser, Session, Account, Profile } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { AdapterUser } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import connectToDatabase from './db';

// Extended user type for NextAuth
interface ExtendedUser extends NextAuthUser {
  id: string;
  role: string;
  image?: string;
}

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    image?: string;
  }
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// OTP utilities
export function generateOTP(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

export async function createOTPRecord(
  email: string,
  type: IOTP['type'],
  referenceEmail?: string
): Promise<string> {
  const OTP = (await import('@/models/OTP')).default;
  const otp = generateOTP();
 
  // Store OTP with the email where it was sent
  await OTP.findOneAndUpdate(
    { email, type },
    { 
      otp, 
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      referenceEmail: referenceEmail || email
    },
    { upsert: true, new: true }
  );
  
  // Send OTP via email
  await sendOTPEmail(email, otp, type);
 
  return otp;
}

export async function verifyOTP(
  email: string,
  otp: string,
  type: IOTP['type']
): Promise<{ isValid: boolean; referenceEmail?: string }> {
  const OTP = (await import('@/models/OTP')).default;
  
  // First try to find OTP with the provided email
  let record = await OTP.findOne({ email, otp, type });
  
  // If not found, try to find OTP where this email is the reference email
  if (!record) {
    record = await OTP.findOne({ referenceEmail: email, otp, type });
  }
 
  if (!record || record.expiresAt < new Date()) {
    return { isValid: false };
  }
 
  await OTP.deleteOne({ _id: record._id });
  return { 
    isValid: true, 
    referenceEmail: record.referenceEmail || record.email 
  };
}

// Token utilities
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

interface JwtCallbackParams {
  token: JWT;
  user?: NextAuthUser | AdapterUser;
  account?: Account | null;
  profile?: Profile;
  trigger?: "signIn" | "signUp" | "update";
  isNewUser?: boolean;
  session?: Session;
}

// NextAuth Configuration
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(
        credentials: Record<"email" | "password", string> | undefined
      ): Promise<ExtendedUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email }).select('+password');
        if (!user) throw new Error('No user found with this email');

        if (!user.emailVerified) {
          throw new Error('Please verify your email first');
        }

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) throw new Error('Incorrect password');

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.profileImage
        };
      }
    })
  ],
  callbacks: {
    async jwt(params: JwtCallbackParams) {
      const { token, user } = params;
      if (user && 'role' in user) {
        token.id = user.id;
        token.role = (user as ExtendedUser).role;
        token.image = (user as ExtendedUser).image;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.image = token.image;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
    verifyRequest: '/auth/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt' as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
};

// Export the NextAuth handler
export default NextAuth(authOptions);