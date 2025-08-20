// app/dashboard/projects/[id]/page.tsx
'use client';
import ProjectView from '@/components/Superadmin/Projects/ProjectView';

export default function ProjectDetailPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectView />
    </div>
  );
}