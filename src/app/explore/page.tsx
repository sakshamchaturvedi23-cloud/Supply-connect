'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Compass, RefreshCw, Shuffle } from 'lucide-react';
import { useDisruptions } from '@/lib/useDisruptions';
import { useSavedSignals } from '@/lib/saved';
import {
  CATEGORIES,
  CategoryKey,
  Disruption,
  PER_CATEGORY,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  bySeverityThenDate,
  categorize,
  categoryMeta,
  severityOf,
} from '@/lib/disruptions';
import { decodeEntities, relativeTime } from '@/lib/text';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import { PageContainer, PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SEVERITY_BG } from '@/components/ui/Badge';
import { SearchField, SegmentedControl } from '@/components/ui/Controls';
import { EmptyState, InlineError, Skeleton, Spinner } from '@/components/ui/Feedback';
import { SignalCard } from '@/components/radar/SignalCard';
import { DailyBrief } from '@/components/radar/DailyBrief';

type Filter = 'all' | CategoryKey;
type Item = Disruption & { bucket: CategoryKey };
const PER_CATEGORY_IN_ALL = 3;

function RadarContent() {
  const highlightId = useSearchParams().get('highlight');
  const { data, status, syncing, sync, shuffle, lastSyncedAt } = useDisruptions({ autoSync: true });
  const { isSaved, toggle } = useSavedSignals();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const pull = usePullToRefresh(sync, !syncing);

  /* ---------- derived data ---------- */

  // `data` arrives already shuffled, so every load/sync/shuffle deals a different set of cards.
  const items: Item[] = useMemo(() => data.map((d) => ({ ...d, bucket: categorize(d) })), [data]);

  const buckets = useMemo(() => {
    const b = Object.fromEntries(CATEGORIES.map((c) => [c.key, [] as Item[]])) as Record<CategoryKey, Item[]>;
    for (const i of items) if (b[i.bucket].length < PER_CATEGORY) b[i.bucket].push(i);
    return b;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: Item[];
    if (q) {
      list = items.filter((i) =>
        [i.title, i.location, i.category, i.description].some((f) => decodeEntities(f).toLowerCase().includes(q)),
      );
    } else if (filter !== 'all') {
      list = buckets[filter];
    } else {
      // Balanced mix: a few random signals from every sector.
      list = [];
      for (let r = 0; r < PER_CATEGORY_IN_ALL; r++) {
        for (const c of CATEGORIES) if (buckets[c.key][r]) list.push(buckets[c.key][r]);
      }
    }
    if (highlightId && !q) {
      const target = items.find((i) => i.id === highlightId);
      if (target && !list.some((i) => i.id === target.id)) list = [target, ...list];
    }
    return list;
  }, [items, buckets, query, filter, highlightId]);

  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of items) counts[severityOf(i.severity)]++;
    // The top signal is always the most severe one, regardless of shuffle order.
    const top = items.reduce<Item | undefined>((best, i) => (!best || bySeverityThenDate(i, best) < 0 ? i : best), undefined);
    return { total: items.length, counts, urgent: counts.critical + counts.high, top };
  }, [items]);

  const filterOptions = useMemo(
    () => [
      { value: 'all' as Filter, label: 'All sectors', count: items.length },
      ...CATEGORIES.map((c) => ({ value: c.key as Filter, label: c.short, count: items.filter((i) => i.bucket === c.key).length })),
    ],
    [items],
  );

  /* ---------- highlight when arriving from a saved signal ---------- */

  useEffect(() => {
    if (!highlightId || status !== 'ready') return;
    const el = document.getElementById(`card-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.dataset.flash = 'true';
    const t = setTimeout(() => delete el.dataset.flash, 2600);
    return () => {
      clearTimeout(t);
      delete el.dataset.flash;
    };
  }, [highlightId, status]);

  /* ---------- render ---------- */

  return (
    <PageContainer>
      {pull > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-20 flex justify-center md:hidden" style={{ transform: `translateY(${pull / 3}px)` }}>
          <span className="material flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] text-label-2">
            <RefreshCw className="h-3.5 w-3.5" style={{ transform: `rotate(${pull * 2}deg)` }} />
            {pull >= 140 ? 'Release to sync' : 'Pull to sync'}
          </span>
        </div>
      )}

      <PageHeader
        title="Disruption Radar"
        description="Live risk signals from global news. Save the ones that matter, read the original article, or turn any of them into a plan."
        actions={
          <>
            <span className="text-[13px] text-label-3" aria-live="polite">
              {syncing ? 'Syncing latest news…' : lastSyncedAt ? `Synced ${relativeTime(lastSyncedAt)}` : null}
            </span>
            <Button variant="secondary" size="sm" onClick={shuffle} disabled={status !== 'ready' || syncing}>
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle
            </Button>
            <Button variant="secondary" size="sm" onClick={sync} disabled={syncing}>
              {syncing ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync now
            </Button>
          </>
        }
      />

      {status === 'error' && (
        <InlineError className="mt-6">Couldn’t load signals from Supabase. Check NEXT_PUBLIC_SUPABASE_URL and the anon key, then reload.</InlineError>
      )}

      {/* Summary */}
      <Card className="mt-8 grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="text-caption text-label-2">Signals tracked</p>
          <p className="mt-1 text-title-1 tabular-nums">{status === 'loading' ? '–' : stats.total}</p>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            {SEVERITY_ORDER.map((k) =>
              stats.total && stats.counts[k] ? (
                <div key={k} className={SEVERITY_BG[k]} style={{ width: `${(stats.counts[k] / stats.total) * 100}%` }} />
              ) : null,
            )}
          </div>
          <p className="mt-2 text-[12px] text-label-3">
            {SEVERITY_ORDER.map((k) => `${stats.counts[k]} ${SEVERITY_LABEL[k].toLowerCase()}`).join(', ')}
          </p>
        </div>
        <div className="p-5">
          <p className="text-caption text-label-2">Need attention</p>
          <p className="mt-1 text-title-1 tabular-nums text-critical">{status === 'loading' ? '–' : stats.urgent}</p>
          <p className="mt-3 text-[13px] text-label-3">Critical and high severity. Worth checking your buffers and suppliers.</p>
        </div>
        <div className="min-w-0 p-5">
          <p className="text-caption text-label-2">Most exposed sector</p>
          <p className="mt-1 truncate text-title-2">{stats.top ? categoryMeta(stats.top.bucket).short : '–'}</p>
          <p className="mt-3 line-clamp-2 text-[13px] text-label-3">{stats.top ? decodeEntities(stats.top.title) : 'Waiting for signals.'}</p>
        </div>
      </Card>

      <DailyBrief data={data} ready={status === 'ready' && !syncing} />

      {/* Filters */}
      <div className="mt-12 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl<Filter>
          label="Filter by sector"
          value={query ? ('' as Filter) : filter}
          onChange={(v) => {
            setFilter(v);
            setQuery('');
          }}
          options={filterOptions}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search title, place or sector" className="lg:w-80" />
      </div>

      {/* Feed */}
      <div className="mt-6">
        {status === 'loading' ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-card" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-5 w-5" />}
            title={query ? `No signals match “${query}”` : 'No signals yet'}
            description={query ? 'Try a country, a material or a company name.' : 'Sync to pull the latest supply chain news.'}
            action={
              !query && (
                <Button size="sm" onClick={sync} disabled={syncing}>
                  Sync now
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <SignalCard key={item.id} item={item} saved={isSaved(item.id)} onToggleSave={toggle} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function RadarPage() {
  return (
    <Suspense>
      <RadarContent />
    </Suspense>
  );
}
