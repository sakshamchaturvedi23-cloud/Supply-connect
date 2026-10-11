'use client';

/**
 * TopNavigation — Bloom Liquid-Glass Top Navigation for Supply Connect
 * 
 * Strict monochrome liquid-glass palette:
 * - Desktop: Compact horizontal single-line pill with all primary navigation destinations.
 * - Tablet/Mobile: Expanding/collapsing accessible capsule.
 * - Strict grayscale palette: black, charcoal, neutral gray, white, transparent white.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, ChevronDown } from 'lucide-react';
import { NAV_ITEMS, isActivePath } from '@/components/shell/nav';
import { Logo } from '@/components/shell/Logo';
import { ProfileMenu } from '@/components/shell/ProfileMenu';
import { cn } from '@/components/ui/cn';

interface TopNavigationProps {
  savedCount: number;
  onOpenSaved: () => void;
  className?: string;
}

export function TopNavigation({
  savedCount,
  onOpenSaved,
  className,
}: TopNavigationProps) {
  const pathname = usePathname();
  const menuId = useId();

  // Mobile / tablet expanding pill state
  const [isOpen, setIsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }
  const pillRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Identify current active item
  const activeItem = useMemo(() => {
    return NAV_ITEMS.find((item) => isActivePath(pathname, item.href)) ?? NAV_ITEMS[0];
  }, [pathname]);

  // Close mobile menu on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        pillRef.current &&
        !pillRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const links = menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
        if (links && links.length > 0) {
          const focusedIndex = Array.from(links).findIndex((el) => el === document.activeElement);
          const nextIndex = (focusedIndex + 1) % links.length;
          links[nextIndex]?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const links = menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
        if (links && links.length > 0) {
          const focusedIndex = Array.from(links).findIndex((el) => el === document.activeElement);
          const prevIndex = focusedIndex <= 0 ? links.length - 1 : focusedIndex - 1;
          links[prevIndex]?.focus();
        }
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const ActiveIcon = activeItem?.icon;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full h-16 border-b border-white/[0.07] bg-[#040406]/60 backdrop-blur-xl select-none',
        className,
      )}
    >
      <div className="mx-auto flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Left Column: Brand / Logo */}
        <div className="flex items-center gap-3">
          <Logo href="/" />
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-mono font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Center Column: Frosted Glass Pill Navigation */}
        <div className="flex items-center justify-center">
          {/* Desktop Mode: Compact horizontal single-line glass pill */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-1 bg-[#0a0d14]/60 backdrop-blur-md border border-white/[0.07] shadow-xl rounded-full p-1"
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
                    active
                      ? 'bg-white text-black font-semibold shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', active ? 'text-black' : 'text-slate-400')} />
                  <span>{label}</span>
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-black ml-0.5" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Tablet & Mobile Mode: Expanding Capsule Pill */}
          <div ref={pillRef} className="relative flex lg:hidden items-center">
            <button
              type="button"
              ref={triggerRef}
              id="top-nav-toggle"
              aria-expanded={isOpen}
              aria-controls={menuId}
              aria-label={
                isOpen
                  ? 'Close navigation destinations'
                  : `Navigation menu: current page is ${pathname === '/' ? 'Home' : (activeItem?.label ?? 'Overview')}`
              }
              onClick={() => setIsOpen((prev) => !prev)}
              className={cn(
                'group flex items-center gap-2 rounded-full liquid-glass-strong px-3.5 py-1.5 text-xs font-medium text-white/90 transition-all hover:text-white focus-visible:outline-2 focus-visible:outline-white/60',
                isOpen && 'bg-white/15 text-white border-white/30',
              )}
            >
              {pathname !== '/' && ActiveIcon && <ActiveIcon className="h-3.5 w-3.5 text-white shrink-0" />}
              <span className="truncate max-w-[120px] font-medium">{pathname === '/' ? 'Platform' : (activeItem?.label ?? 'Menu')}</span>
              <span className="text-white/30">·</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">Nav</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-white/50 transition-transform duration-200 group-hover:text-white',
                  isOpen && 'rotate-180 text-white',
                )}
              />
            </button>

            {/* Mobile Expanded Floating Capsule Dropdown */}
            {isOpen && (
              <div
                id={menuId}
                role="menu"
                aria-label="Navigation destinations"
                ref={menuRef}
                className="absolute left-1/2 -translate-x-1/2 top-12 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-[#0a0d14]/90 backdrop-blur-xl border border-white/[0.09] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
              >
                <div className="px-3 py-1.5 mb-1 flex items-center justify-between border-b border-white/[0.08]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Navigation
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Esc to close</span>
                </div>
                <ul className="space-y-1">
                  {NAV_ITEMS.map(({ href, label, icon: Icon, description }) => {
                    const active = isActivePath(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          role="menuitem"
                          onClick={() => setIsOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors',
                            active
                              ? 'bg-white text-black font-semibold shadow-md'
                              : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-black' : 'text-slate-400')} />
                            <div className="truncate">
                              <p className="font-medium truncate">{label}</p>
                              <p className={cn('text-[10px] truncate', active ? 'text-black/70' : 'text-slate-400')}>{description}</p>
                            </div>
                          </div>
                          {active && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-mono text-black font-semibold">
                              <span className="h-1.5 w-1.5 rounded-full bg-black" />
                              Active
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions (Saved items & Profile menu) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenSaved}
            aria-label={`Saved items (${savedCount})`}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-all relative shadow-sm"
          >
            <Bookmark className={cn('h-3.5 w-3.5', savedCount > 0 ? 'text-white fill-white' : 'text-slate-400')} />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-white/20 text-white px-1 text-[10px] font-mono font-medium">
                {savedCount}
              </span>
            )}
          </button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
