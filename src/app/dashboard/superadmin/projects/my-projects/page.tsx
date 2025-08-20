// app/dashboard/projects/my-projects/page.tsx
'use client';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeProjectList from '@/components/Employee/Projects/EmployeeProjectList';
import EmployeeTaskList from '@/components/Employee/Projects/EmployeeTaskList';

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('projects');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">My Work</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">My Projects</TabsTrigger>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'projects' ? (
        <EmployeeProjectList />
      ) : (
        <EmployeeTaskList />
      )}
    </div>
  );
}