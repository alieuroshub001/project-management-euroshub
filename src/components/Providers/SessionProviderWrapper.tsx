'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { SocketProvider } from '@/context/SocketContext';

type Props = {
  children: React.ReactNode;
  session?: Session | null;
};

export default function SessionProviderWrapper({ children, session }: Props) {
  return (
    <SessionProvider session={session}>
      <SocketProvider>{children}</SocketProvider>
    </SessionProvider>
  );
}
