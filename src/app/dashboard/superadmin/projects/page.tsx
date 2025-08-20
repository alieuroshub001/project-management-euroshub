// app/dashboard/projects/page.tsx
import ProjectList from '@/components/SuperAdmin/Projects/ProjectList';
import { UserRole } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role as UserRole;

  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectList role={role} />
    </div>
  );
}