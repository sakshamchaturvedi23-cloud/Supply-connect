'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from './cn';

/** Apple-style segmented control. Scrolls horizontally on small screens. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  trackClassName = 'bg-white/[0.03] backdrop-blur-md border border-white/[0.07]',
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  /** Track colour; use a darker one when placed on a surface. */
  trackClassName?: string;
}) {
  return (
    <div className={cn('-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0', className)}>
      <div role="tablist" aria-label={label} className={cn('inline-flex gap-1 rounded-full p-1 shadow-sm', trackClassName)}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-all',
                active ? 'bg-white text-black font-semibold shadow-md' : 'text-slate-400 hover:text-white',
              )}
            >
              {o.label}
              {o.count !== undefined && <span className={cn('tabular-nums font-mono text-xs', active ? 'text-black/80 font-semibold' : 'text-slate-400')}>{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn('relative flex h-10 items-center rounded-full bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] px-3.5 focus-within:ring-2 focus-within:ring-white/20 shadow-sm', className)}>
      <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full w-full bg-transparent px-2.5 text-sm text-white outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20">
          <X className="h-3 w-3" />
        </button>
      )}
    </label>
  );
}
