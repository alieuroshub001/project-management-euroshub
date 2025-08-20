import LeaveReports from '@/components/HR/Leave/LeaveReports';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leave Reports',
  description: 'Generate and export leave reports',
};

export default function LeaveReportsPage() {
  return (
    <div className="container mx-auto py-6">
      <LeaveReports />
    </div>
  );
}