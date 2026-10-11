'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { displayName, initials, signOut, useAuthUser } from '@/lib/auth';
import { Spinner } from '@/components/ui/Feedback';
import { cn } from '@/components/ui/cn';

/** Avatar button with an account dropdown (signed-in user, Log out). */
export function ProfileMenu({ className }: { className?: string }) {
  const router = useRouter();
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setOpen(false);
    router.replace('/login');
    router.refresh();
  };

  const name = displayName(user);
  const letters = initials(user);
  const avatar = (size: string) => (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-surface-3 font-semibold text-label', size)}>
      {letters || <UserIcon className="h-[55%] w-[55%] text-label-2" strokeWidth={1.8} />}
    </span>
  );

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="rounded-full ring-1 ring-line transition-shadow hover:ring-line-strong"
      >
        {avatar('h-9 w-9 text-[13px]')}
      </button>

      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl bg-surface-2 p-1.5 shadow-2xl ring-1 ring-line">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            {avatar('h-10 w-10 text-[14px]')}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-label">{name}</p>
              <p className="truncate text-[12px] text-label-3">{user?.email ?? 'Not signed in'}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            ref={firstItemRef}
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[14px] text-critical transition-colors hover:bg-critical/10 focus-visible:bg-critical/10 disabled:opacity-60"
          >
            {signingOut ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
