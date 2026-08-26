'use client';

import { AbbyChatProvider } from '@/components/AbbyChatContext';
import Chatbot from '@/components/Chatbot';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AbbyChatProvider>
      {children}
      <Chatbot />
    </AbbyChatProvider>
  );
}
