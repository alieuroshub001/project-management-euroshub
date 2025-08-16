import { UserRole } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LeaveClientWrapper } from '@/components/Employee/Leave/LeaveClientWrapper';
import LeaveRequestList from '@/components/Employee/Leave/LeaveRequestList';
import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';

export default async function LeavePage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/login');
  }

  const userRole = session.user.role as UserRole;
  const isEmployee = userRole === 'employee';

  return (
    <LeaveClientWrapper>
      <div className="flex h-screen bg-white">
        {/* Desktop Sidebar - Leave Stats */}
        <div className="hidden md:block w-80 border-r border-gray-200 bg-gray-50">
          <div className="p-4 h-full overflow-hidden">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Leave Balance</h2>
              
              {/* Leave Stats Cards */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Vacation</span>
                    <span className="text-sm font-semibold">12/20 days</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: '60%' }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Sick Leave</span>
                    <span className="text-sm font-semibold">2/10 days</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: '20%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Link
                  href="/dashboard/leave/new"
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>New Leave Request</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">My Leave Requests</h1>
              <Link
                href="/dashboard/leave/new"
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <CalendarPlus className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Mobile Leave Stats */}
          <div className="md:hidden bg-gray-50 p-4 border-b border-gray-200">
            <div className="flex space-x-4 overflow-x-auto pb-2">
              <div className="flex-shrink-0 bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-40">
                <div className="text-sm font-medium text-gray-700">Vacation</div>
                <div className="text-lg font-semibold mt-1">12/20</div>
              </div>
              <div className="flex-shrink-0 bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-40">
                <div className="text-sm font-medium text-gray-700">Sick Leave</div>
                <div className="text-lg font-semibold mt-1">2/10</div>
              </div>
            </div>
          </div>

          {/* Leave Request List */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-4 overflow-y-auto">
              <LeaveRequestList role={userRole} />
            </div>
          </div>
        </div>
      </div>
    </LeaveClientWrapper>
  );
}

export const metadata = {
  title: 'Leave Management - HR Dashboard',
  description: 'Manage your leave requests and view your leave balance',
};