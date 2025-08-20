import LeaveReviewForm from '@/components/HR/Leave/LeaveReviewForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review Leave Request',
  description: 'Add comments to leave request',
};

export default function LeaveReviewPage({
  params,
}: {
  params: { requestId: string };
}) {
  return (
    <div className="container mx-auto py-6">
      <LeaveReviewForm requestId={params.requestId} />
    </div>
  );
}