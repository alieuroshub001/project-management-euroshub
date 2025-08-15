import VerifyOTPForm from '@/components/Auth/VerifyOTP';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ 
    email?: string;
    type?: 'verification' | 'password-reset';
  }>;
}

export default async function VerifyOTPPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Await the searchParams promise
  const params = await searchParams;

  if (!params.email || !params.type) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VerifyOTPForm 
        email={params.email} 
        type={params.type} 
      />
    </div>
  );
}