// app/dashboard/projects/[id]/settings/page.tsx
'use client';
import { useParams } from 'next/navigation';
import ProjectSettings from '@/components/Superadmin/Projects/ProjectSettings';

export default function ProjectSettingsPage() {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectSettings projectId={id as string} />
    </div>
  );
}