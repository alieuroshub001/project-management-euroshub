// app/dashboard/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/Auth/LogoutButton';
import DashboardNav from '@/components/Dashboard/DashboardNav';
import { UserRole } from '@/types';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Link from 'next/link';
import Image from 'next/image';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const userRole = session.user.role as UserRole;

  // Get freshest name/image from DB (fallback to session)
  let profileImage = session.user.image || '';
  let userName = session.user.name || '';

  try {
    await connectToDatabase();
    const user = await User.findOne({ email: session.user.email });
    if (user) {
      profileImage = user.profileImage || user.image || profileImage;
      userName = user.name || userName;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  const profileHref = '/dashboard/employee/my-profile';
  const initial = (userName?.[0] ?? session.user.email?.[0] ?? 'U').toUpperCase();

  // ⬇️ adjust these two to change avatar size globally
  const AVATAR_PX = 64;              // 64px
  const AVATAR_CLASSES = 'h-16 w-16'; // Tailwind (h-16/w-16 = 64px)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <DashboardNav role={userRole} />

        {/* Main */}
        <div className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
            </h1>

            <div className="flex items-center gap-4">
              <LogoutButton />

              <Link
                href={profileHref}
                className={`group relative inline-flex ${AVATAR_CLASSES} items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 transition hover:ring-2 hover:ring-indigo-500 dark:border-gray-700`}
                title="My Profile"
              >
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt="Profile"
                    fill
                    sizes={`${AVATAR_PX}px`}
                    className="object-cover"
                    priority
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {initial}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
