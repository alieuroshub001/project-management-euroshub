import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SuperadminDashboard() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not a superadmin
  if (!session || session.user.role !== 'superadmin') {
    redirect('/auth/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Superadmin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Superadmin specific components */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">System Overview</h2>
          <p>Manage all system settings and users</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <p>Create, edit, and delete users</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
          <p>View system activity logs</p>
        </div>
      </div>
    </div>
  );
}