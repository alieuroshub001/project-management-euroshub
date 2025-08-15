import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Invalidate session (NextAuth handles this automatically)
  return NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { 
      status: 200,
      headers: {
        'Set-Cookie': `next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
      }
    }
  );
}