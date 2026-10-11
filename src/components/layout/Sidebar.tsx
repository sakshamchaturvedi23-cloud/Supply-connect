'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, Home, Network, Bot, Sparkles, Activity } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { Logo } from '@/components/shell/Logo';
import { ProfileMenu } from '@/components/shell/ProfileMenu';

export interface NavEntry {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string | number;
}

export const MAIN_NAV: NavEntry[] = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/explore', label: 'Disruption Radar', icon: Compass },
  { href: '/impact-copilot', label: 'Impact Copilot', icon: Network },
  { href: '/chat', label: 'Supply AI', icon: Bot },
];

export const WORKFLOW_NAV: NavEntry[] = [
  { href: '/startup-advisor', label: 'Strategy Advisor', icon: Sparkles },
];

export function Sidebar({
  savedCount,
  onOpenSaved,
  onNavigate,
  className,
}: {
  savedCount: number;
  onOpenSaved: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-line bg-canvas select-none',
        className,
      )}
    >
      {/* Header / Brand */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-line/60">
        <Logo onClick={onNavigate} />
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-low/20 bg-low/10 text-[11px] font-mono font-medium text-low">
          <span className="h-1.5 w-1.5 rounded-full bg-low animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-2.5 mb-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-label-3">
            Intelligence Platform
          </p>
          <ul className="space-y-1">
            {MAIN_NAV.map(({ href, label, icon: Icon, badge }) => {
              const active = isLinkActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-surface-2 text-label border border-line-strong shadow-xs font-semibold'
                        : 'text-label-2 hover:bg-surface hover:text-label border border-transparent',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-label-3')} strokeWidth={1.8} />
                    <span className="flex-1 truncate">{label}</span>
                    {badge !== undefined && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-surface-3 text-label-2">
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="px-2.5 mb-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-label-3">
            Strategy & Workspace
          </p>
          <ul className="space-y-1">
            {WORKFLOW_NAV.map(({ href, label, icon: Icon }) => {
              const active = isLinkActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-surface-2 text-label border border-line-strong shadow-xs font-semibold'
                        : 'text-label-2 hover:bg-surface hover:text-label border border-transparent',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-label-3')} strokeWidth={1.8} />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={onOpenSaved}
                className="flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-label-2 hover:bg-surface hover:text-label transition-colors text-left border border-transparent"
              >
                <Bookmark className="h-4 w-4 shrink-0 text-label-3" strokeWidth={1.8} />
                <span className="flex-1 truncate">Saved Items</span>
                {savedCount > 0 && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-surface-3 text-label-2 tabular-nums">
                    {savedCount}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* Telemetry Status Strip */}
        <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-label-3">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-accent" />
              Engine Status
            </span>
            <span className="font-mono text-label-2">pgvector RAG</span>
          </div>
          <div className="h-1 w-full bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full w-full opacity-80" />
          </div>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="border-t border-line p-3">
        <div className="flex items-center justify-between rounded-lg p-1.5 bg-surface border border-line/60">
          <ProfileMenu />
        </div>
      </div>
    </aside>
  );
}

