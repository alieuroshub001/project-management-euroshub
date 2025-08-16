import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeaveClientWrapper } from '@/components/Employee/Leave/LeaveClientWrapper';
import CreateLeaveRequestForm from '@/components/Employee/Leave/LeaveRequestForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewLeaveRequestPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/login');
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
                  href="/dashboard/leave"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Leave</span>
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-xl font-semibold text-gray-900">
                  New Leave Request
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              {/* Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">ℹ</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-900">
                      Leave Request Guidelines
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Submit requests at least 3 days in advance for approval</li>
                        <li>Emergency leave requires documentation</li>
                        <li>Check your remaining leave balance before applying</li>
                        <li>You&apos;ll receive email notifications about your request status</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Leave Form */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <CreateLeaveRequestForm userId={session.user.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LeaveClientWrapper>
  );
}

export const metadata = {
  title: 'New Leave Request - HR Dashboard',
  description: 'Create a new leave request for approval',
};