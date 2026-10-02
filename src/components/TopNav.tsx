// src/components/TopNav.tsx
// Shared, centered navbar for every page. Add routes here once — all pages update.
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// ⚠️ Agar tera radar page ka route alag hai (e.g. /explore), sirf yahan change kar.
export const RADAR_PATH = '/explore';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: RADAR_PATH, label: 'Risk Radar' },
  { href: '/impact-copilot', label: 'Impact Copilot' },
  { href: '/chat', label: 'Supply AI' },
];

export default function TopNav({ right, backHref = '/' }: { right?: React.ReactNode; backHref?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
        <div className="flex justify-start">
          <Link
            href={backHref}
            aria-label="Back"
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-neutral-800 bg-neutral-900/80 p-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-4 sm:text-xs ${
                isActive(l.href)
                  ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex justify-end">{right}</div>
      </div>
    </header>
  );
}