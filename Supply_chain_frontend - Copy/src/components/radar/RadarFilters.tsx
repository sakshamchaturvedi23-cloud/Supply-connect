'use client';

import React from 'react';
import { CategoryKey } from '@/lib/disruptions';
import { SegmentOption } from '@/components/ui/Tabs';
import { Search } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export type FilterKey = 'all' | CategoryKey;

export function RadarFilters({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  filterOptions,
}: {
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  query: string;
  onQueryChange: (q: string) => void;
  filterOptions: SegmentOption<FilterKey>[];
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Filter risk signals by sector" className="inline-flex gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] backdrop-blur-md p-1 shadow-sm">
          {filterOptions.map((o) => {
            const active = query ? false : filter === o.value;
            return (
              <button
                key={o.value}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  onFilterChange(o.value);
                  onQueryChange('');
                }}
                className={cn(
                  'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-all',
                  active
                    ? 'bg-white text-black font-semibold shadow-md'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white',
                )}
              >
                {o.label}
                {o.count !== undefined && (
                  <span className={cn('tabular-nums font-mono text-xs', active ? 'text-black/80 font-semibold' : 'text-slate-400')}>
                    {o.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative flex h-10 items-center rounded-full border border-white/[0.07] bg-[#0a0d14]/50 backdrop-blur-md px-3.5 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 shadow-sm lg:w-80">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter title, port, country..."
          className="h-full w-full bg-transparent px-2.5 text-sm text-white outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

