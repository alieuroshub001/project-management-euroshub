import { UserRole } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeaveClientWrapper } from '@/components/Employee/Leave/LeaveClientWrapper';
import LeaveRequestDetail from '@/components/Employee/Leave/LeaveRequestDetail';
import Link from 'next/link';

export default async function LeaveRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  // Await the params since they're now a Promise in Next.js 15
  const { requestId } = await params;

  // Validate requestId format (basic MongoDB ObjectId validation)
  const isValidRequestId = /^[a-fA-F0-9]{24}$/.test(requestId);
  if (!isValidRequestId) {
    redirect('/dashboard/employee/my-leaves');
  }

  return (
    <LeaveClientWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard/employee/my-leaves"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span>Back to Leave</span>
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Leave Request Details
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LeaveRequestDetail
            requestId={requestId}
            userId={session.user.id}
            role={session.user.role as UserRole}
          />
        </div>
      </div>
    </LeaveClientWrapper>
  );
}

export async function generateMetadata({

}: {
  params: Promise<{ requestId: string }>;
}) {
  return {
    title: 'Leave Request Details',
    description: 'View and manage your leave request',
  };
}