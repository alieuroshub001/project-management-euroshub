import LeaveRequestList from '@/components/HR/Leave/LeaveRequestList';
import LeaveStats from '@/components/HR/Leave/LeaveStats';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HR Leave Management',
  description: 'Manage employee leave requests',
};

export default function HRLeaveDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Management</h1>
      </div>

      <LeaveStats />

      <LeaveRequestList />
    </div>
  );
}