import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LeaveClientWrapper } from '@/components/Employee/Leave/LeaveClientWrapper';
import LeaveRequestForm from '@/components/Employee/Leave/LeaveRequestForm';

export default async function EditLeaveRequestPage({
  params,
}: {
  params: { requestId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  // basic ObjectId sanity check
  const isValidRequestId = /^[a-fA-F0-9]{24}$/.test(params.requestId);
  if (!isValidRequestId) redirect('/dashboard/leave');

  return (
    <LeaveClientWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard/leave"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Leave</span>
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <h1 className="text-xl font-semibold text-gray-900">Edit Leave Request</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <LeaveRequestForm userId={session.user.id} requestId={params.requestId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LeaveClientWrapper>
  );
}

export const metadata = {
  title: 'Edit Leave Request - HR Dashboard',
  description: 'Update an existing leave request',
};
