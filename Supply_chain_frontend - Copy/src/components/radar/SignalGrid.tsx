'use client';

import React from 'react';
import { Compass } from 'lucide-react';
import { Disruption, CategoryKey } from '@/lib/disruptions';
import { SignalCard } from './SignalCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export interface SignalGridProps {
  status: 'loading' | 'ready' | 'error';
  items: (Disruption & { bucket: CategoryKey })[];
  query: string;
  isSaved: (id: string) => boolean;
  onToggleSave: (item: Disruption) => void;
  onSync: () => void;
  syncing: boolean;
}

export function SignalGrid({
  status,
  items,
  query,
  isSaved,
  onToggleSave,
  onSync,
  syncing,
}: SignalGridProps) {
  if (status === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[380px] rounded-2xl border border-white/10 bg-[#080d0b]/80 p-4 flex flex-col justify-between">
            <Skeleton className="aspect-video w-full rounded-xl bg-white/[0.06]" />
            <div className="space-y-2 mt-4">
              <Skeleton className="h-4 w-3/4 bg-white/[0.06]" />
              <Skeleton className="h-3 w-1/2 bg-white/[0.06]" />
              <Skeleton className="h-12 w-full mt-2 bg-white/[0.06]" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl mt-4 bg-white/[0.06]" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Compass className="h-5 w-5 text-accent" />}
        title={query ? `No signals match "${query}"` : 'No disruption signals active'}
        description={
          query
            ? 'Try searching by country, port name, raw material, or corporate entity.'
            : 'Trigger a manual sync to fetch latest supply telemetry from global feeds.'
        }
        action={
          !query && (
            <Button size="sm" onClick={onSync} disabled={syncing}>
              Sync feeds now
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <SignalCard
          key={item.id}
          item={item}
          saved={isSaved(item.id)}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
}

