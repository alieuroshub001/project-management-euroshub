import LeaveRequestDetail from '@/components/HR/Leave/LeaveRequestDetail';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leave Request Details',
  description: 'View and manage leave request details',
};

export default function LeaveRequestDetailPage({
  params,
}: {
  params: { requestId: string };
}) {
  return (
    <div className="container mx-auto py-6">
      <LeaveRequestDetail requestId={params.requestId} />
    </div>
  );
}