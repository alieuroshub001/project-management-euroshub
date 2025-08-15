import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not an employee
  if (!session || session.user.role !== 'employee') {
    redirect('/auth/login');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Employee Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Welcome, {session.user.name}</h2>
        <p>Your tasks and work information will appear here</p>
      </div>
    </div>
  );
}