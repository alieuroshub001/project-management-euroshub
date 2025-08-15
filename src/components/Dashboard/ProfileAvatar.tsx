// components/Dashboard/ProfileAvatar.tsx
"use client";

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface ProfileAvatarProps {
  profileHref: string;
  initialImage?: string | null;
  initialName?: string | null;
  initialEmail?: string | null;
}

export default function ProfileAvatar({ 
  profileHref, 
  initialImage, 
  initialName, 
  initialEmail 
}: ProfileAvatarProps) {
  const { data: session } = useSession();
  const [imageError, setImageError] = useState(false);

  // Use session data if available, otherwise fall back to initial props
  const profileImage = session?.user?.image || initialImage;
  const userName = session?.user?.name || initialName;
  const userEmail = session?.user?.email || initialEmail;
  
  const initial = (userName?.[0] ?? userEmail?.[0] ?? 'U').toUpperCase();

  return (
    <Link
      href={profileHref}
      className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 transition hover:ring-2 hover:ring-indigo-500 dark:border-gray-700"
      title="My Profile"
    >
      {profileImage && !imageError ? (
        <Image
          src={profileImage}
          alt="Profile"
          fill
          sizes="40px"
          className="object-cover"
          onError={() => setImageError(true)}
          key={profileImage} // Force re-render when image changes
        />
      ) : (
        <span className="h-full w-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-sm font-semibold text-white flex items-center justify-center">
          {initial}
        </span>
      )}
    </Link>
  );
}