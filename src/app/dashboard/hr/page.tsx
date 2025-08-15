import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HRDashboard() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not HR
  if (!session || session.user.role !== 'hr') {
    redirect('/auth/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">HR Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Employee Management</h2>
          <p>View and manage employees</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recruitment</h2>
          <p>Manage job postings and candidates</p>
        </div>
      </div>
    </div>
  );
}