'use client';

import React from 'react';
import { Menu, Bookmark } from 'lucide-react';
import { Logo } from '@/components/shell/Logo';
import { ProfileMenu } from '@/components/shell/ProfileMenu';
import { IconButton } from '@/components/ui/Button';

export function Topbar({
  savedCount,
  onOpenMenu,
  onOpenSaved,
}: {
  savedCount: number;
  onOpenMenu: () => void;
  onOpenSaved: () => void;
}) {
  return (
    <header className="material sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line px-4 md:hidden">
      <div className="flex items-center gap-2">
        <IconButton aria-label="Open navigation menu" onClick={onOpenMenu} size="sm">
          <Menu className="h-5 w-5" />
        </IconButton>
        <Logo />
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton
          aria-label={`Saved items (${savedCount})`}
          onClick={onOpenSaved}
          size="sm"
          className="relative"
        >
          <Bookmark className="h-4 w-4" />
          {savedCount > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white font-mono">
              {savedCount}
            </span>
          )}
        </IconButton>
        <ProfileMenu />
      </div>
    </header>
  );
}

