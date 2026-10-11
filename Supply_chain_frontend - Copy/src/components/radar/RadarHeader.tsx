'use client';

import React from 'react';
import { RefreshCw, Shuffle } from 'lucide-react';
import { relativeTime } from '@/lib/text';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Feedback';

export interface RadarHeaderProps {
  status: 'loading' | 'ready' | 'error';
  syncing: boolean;
  lastSyncedAt: number | null;
  onShuffle: () => void;
  onSync: () => void;
}

export function RadarHeader({
  status,
  syncing,
  lastSyncedAt,
  onShuffle,
  onSync,
}: RadarHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.07] pb-6">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-title-1 font-semibold text-white tracking-tight">Disruption Radar</h1>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-mono font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE FEED
          </span>
        </div>
        <p className="max-w-2xl text-body text-slate-400 leading-relaxed">
          Real-time global risk telemetry curated from maritime intelligence, commodity exchanges, and technology supply chains.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-400 mr-2" aria-live="polite">
          {syncing ? (
            <span className="flex items-center gap-1 text-white/80">
              <Spinner className="h-3 w-3" /> Syncing feeds...
            </span>
          ) : lastSyncedAt ? (
            `Synced ${relativeTime(lastSyncedAt)}`
          ) : null}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onShuffle}
          disabled={status !== 'ready' || syncing}
          leftIcon={<Shuffle className="h-3.5 w-3.5" />}
          className="border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
        >
          Shuffle
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          leftIcon={syncing ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
          className="border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
        >
          Sync now
        </Button>
      </div>
    </header>
  );
}

