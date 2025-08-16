import { UserRole } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeaveClientWrapper } from '@/components/Employee/Leave/LeaveClientWrapper';
import LeaveRequestDetail from '@/components/Employee/Leave/LeaveRequestDetail';

export default async function LeaveRequestPage({
  params,
}: {
  params: { requestId: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/login');
  }

  // Validate requestId format (basic MongoDB ObjectId validation)
  const isValidRequestId = /^[a-fA-F0-9]{24}$/.test(params.requestId);
  if (!isValidRequestId) {
    redirect('/dashboard/leave');
  }

  return (
    <LeaveClientWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <a
                  href="/dashboard/leave"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span>Back to Leave</span>
                </a>
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
            requestId={params.requestId} 
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
  params: { requestId: string };
}) {
  return {
    title: 'Leave Request Details - HR Dashboard',
    description: 'View and manage your leave request',
  };
}