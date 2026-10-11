'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { displayName, initials, isBypassUser, signOut, useAuthUser } from '@/lib/auth';
import { Spinner } from '@/components/ui/Feedback';
import { cn } from '@/components/ui/cn';

/** Avatar button with an account dropdown in monochrome liquid glass. */
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
  const isBypass = isBypassUser(user);

  const avatar = (size: string) => (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-medium border border-white/20 bg-white/10 text-white',
        size
      )}
    >
      {letters || <UserIcon className="h-[55%] w-[55%] text-white/70" strokeWidth={1.8} />}
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
        className="rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white/60"
      >
        {avatar('h-8 w-8 text-xs')}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-11 z-50 w-64 rounded-2xl liquid-glass-strong p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            {avatar('h-9 w-9 text-xs')}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{name}</p>
              <p className="truncate text-[11px] text-white/60">{user?.email ?? 'Not signed in'}</p>
              {isBypass && (
                <span className="mt-1 inline-flex items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
                  ⚡ Dev Auth Active
                </span>
              )}
            </div>
          </div>
          <div className="my-1.5 h-px bg-white/[0.08]" />
          {user ? (
            <button
              ref={firstItemRef}
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {signingOut ? <Spinner className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5 text-white/60" />}
              <span>{isBypass ? 'View Login Screen' : 'Log out'}</span>
            </button>
          ) : (
            <a
              href="/login"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-white transition-colors hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5 rotate-180 text-white/60" />
              <span>Sign in to your account</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
