'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Menu, X } from 'lucide-react';
import { useAdvisorChats, useSavedSignals } from '@/lib/saved';
import { cn } from '@/components/ui/cn';
import { IconButton } from '@/components/ui/Button';
import { Logo } from './Logo';
import { NAV_ITEMS, isActivePath } from './nav';
import { SavedSheet } from './SavedSheet';

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] tracking-[-0.01em] transition-colors',
                active ? 'bg-surface-2 font-medium text-label' : 'text-label-2 hover:bg-surface hover:text-label',
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent' : 'text-label-3')} strokeWidth={1.8} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SavedButton({ count, onClick, compact }: { count: number; onClick: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <IconButton aria-label={`Saved items (${count})`} onClick={onClick} className="relative">
        <Bookmark className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </IconButton>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[14px] text-label-2 transition-colors hover:bg-surface hover:text-label"
    >
      <Bookmark className="h-[18px] w-[18px] text-label-3" strokeWidth={1.8} />
      Saved
      {count > 0 && <span className="ml-auto text-[12px] tabular-nums text-label-3">{count}</span>}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const { signals } = useSavedSignals();
  const { chats } = useAdvisorChats();
  const savedCount = signals.length + chats.length;

  const closeSaved = useCallback(() => setSavedOpen(false), []);
  const openSaved = useCallback(() => {
    setDrawerOpen(false);
    setSavedOpen(true);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-canvas px-3 py-5 md:flex">
        <div className="px-2.5 pb-6">
          <Logo />
        </div>
        <nav aria-label="Main" className="flex-1">
          <NavList pathname={pathname} />
        </nav>
        <div className="border-t border-line pt-3">
          <SavedButton count={savedCount} onClick={openSaved} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="material sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line px-3 md:hidden">
        <IconButton aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
          <Menu className="h-5 w-5" />
        </IconButton>
        <Logo />
        <SavedButton compact count={savedCount} onClick={openSaved} />
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-72 flex-col bg-canvas px-3 py-4 shadow-2xl">
            <div className="flex items-center justify-between px-2.5 pb-5">
              <Logo onClick={() => setDrawerOpen(false)} />
              <IconButton aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <nav aria-label="Main" className="flex-1">
              <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <div className="border-t border-line pt-3">
              <SavedButton count={savedCount} onClick={openSaved} />
            </div>
          </div>
        </div>
      )}

      <main id="main" className="md:pl-60">
        {children}
      </main>

      <SavedSheet open={savedOpen} onClose={closeSaved} />
    </div>
  );
}
