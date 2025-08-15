// app/dashboard/employee/my-profile/page.tsx
import { Metadata } from 'next';
import MyProfile from '@/components/Employee/MyProfile/Profile';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View and update your profile information',
};

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow">
        <MyProfile />
      </div>
    </div>
  );
}