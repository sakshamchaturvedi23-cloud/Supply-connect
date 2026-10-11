'use client';

import React, { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAdvisorChats, useSavedSignals } from '@/lib/saved';
import { SavedSheet } from '@/components/shell/SavedSheet';
import { TopNavigation } from './TopNavigation';
import { ProductBackground } from './ProductBackground';
import { CursorRingField } from '@/components/ui/CursorRingField';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [savedOpen, setSavedOpen] = useState(false);

  const { signals } = useSavedSignals();
  const { chats } = useAdvisorChats();
  const savedCount = signals.length + chats.length;

  const closeSaved = useCallback(() => setSavedOpen(false), []);
  const openSaved = useCallback(() => setSavedOpen(true), []);

  // Auth callback
  if (pathname === '/auth/callback') {
    return <>{children}</>;
  }

  // Public login page gets atmospheric background and centered card
  if (pathname === '/login') {
    return (
      <div className="relative min-h-[100dvh] bg-[#040406] text-white overflow-hidden">
        <ProductBackground />
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <CursorRingField palette={['#3074f9', '#7189ff', '#0f172a']} />
        </div>
        <main className="min-h-[100dvh] w-full flex items-center justify-center p-4 relative z-10 bg-transparent">
          {children}
        </main>
      </div>
    );
  }

  const isLandingPage = pathname === '/';

  return (
    <div className="relative min-h-[100dvh] bg-[#040406] text-white">
      {/* Atmospheric full-viewport monochrome background */}
      <ProductBackground />

      {/* Dynamic ambient WebGL CursorRingField — strictly excluded on landing page ('/') */}
      {!isLandingPage && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <CursorRingField palette={['#3074f9', '#7189ff', '#0f172a']} />
        </div>
      )}

      {/* Accessibility skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Compact Liquid-Glass Top Navigation */}
      <TopNavigation
        savedCount={savedCount}
        onOpenSaved={openSaved}
      />

      {/* Main Content Area — Full width, transparent background so WebGL ring field shines through */}
      <main id="main-content" className="min-h-[calc(100dvh-var(--topbar-h))] w-full focus:outline-none relative z-10 bg-transparent">
        {children}
      </main>

      {/* Global Saved Items Sheet */}
      <SavedSheet open={savedOpen} onClose={closeSaved} />
    </div>
  );
}
