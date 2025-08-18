'use client';

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
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatMain />
      </div>
    </div>
  );
}

