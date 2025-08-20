// app/superadmin/users/page.tsx
import UserList from '@/components/SuperAdmin/Users/UserList';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SuperadminUsersPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user.role !== 'superadmin') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <UserList />
    </div>
  );
}