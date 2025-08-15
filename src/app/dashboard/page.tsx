import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/Auth/LogoutButton';
import DeleteAccountButton from '@/components/Auth/DeleteAccountButton';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // If user is not logged in, redirect to login
  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <LogoutButton />
          <DeleteAccountButton userId={session.user.id} />
        </div>
      </div>
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <p>Welcome, {session.user?.name}!</p>
        <p className="mt-2">Email: {session.user?.email}</p>
        <p className="mt-2">Role: {session.user?.role}</p>
      </div>
    </div>
  );
}