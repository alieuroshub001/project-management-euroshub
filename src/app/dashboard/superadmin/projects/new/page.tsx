// app/dashboard/projects/new/page.tsx
'use client';
import CreateProjectForm from '@/components/SuperAdmin/Projects/CreateProjectForm';

export default function NewProjectPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CreateProjectForm />
    </div>
  );
}