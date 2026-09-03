'use client';

import { AbbyChatProvider } from '@/components/AbbyChatContext';
import Chatbot from '@/components/Chatbot';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideChat = pathname?.startsWith('/admin') ?? false;

  return (
    <AbbyChatProvider>
      {children}
      {hideChat ? null : <Chatbot />}
    </AbbyChatProvider>
  );
}
