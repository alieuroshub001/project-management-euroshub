'use client';

// no local state currently
import { useSession } from 'next-auth/react';
import ChatMain from '@/components/Employee/Chat/ChatMain';

export default function ChatPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please sign in to access the chat</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatMain />
      </div>
    </div>
  );
}
