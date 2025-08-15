import ResetPasswordForm from '@/components/Auth/ResetPassword';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ 
    email?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Await the searchParams promise
  const params = await searchParams;
  
  if (!params.email) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResetPasswordForm email={params.email} />
    </div>
  );
}