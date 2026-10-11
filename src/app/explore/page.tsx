'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Compass,
  Globe2,
  Grid3X3,
  MapPin,
  RefreshCw,
  RotateCw,
  Shuffle,
} from 'lucide-react';
import { useDisruptions } from '@/lib/useDisruptions';
import { useSavedSignals } from '@/lib/saved';
import {
  CATEGORIES,
  CategoryKey,
  Disruption,
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
import { SearchField } from '@/components/ui/Controls';
import { EmptyState, InlineError, Skeleton, Spinner } from '@/components/ui/Feedback';
import {
  ActivityTimeline,
  DailyBrief,
  RadarMap,
  RadarSignalCarousel,
  SignalCard,
} from '@/components/radar';
import { cn } from '@/components/ui/cn';

type Filter = 'all' | CategoryKey;
type Item = Disruption & { bucket: CategoryKey };
type ViewMode = 'map' | 'grid';

function RadarContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const { data, status, syncing, sync, syncError, shuffle, lastSyncedAt } = useDisruptions({ autoSync: true });
  const { isSaved, toggle } = useSavedSignals();

  // Primary interactive states
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(highlightId);
  const activeSelectedId = selectedId ?? highlightId;
  const [maxDateTimestamp, setMaxDateTimestamp] = useState<number | null>(null);
  const [showCorridors, setShowCorridors] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'feed' | 'brief'>('feed');

  const pull = usePullToRefresh(sync, !syncing);

  /* ---------- derived data ---------- */

  const items: Item[] = useMemo(() => data.map((d) => ({ ...d, bucket: categorize(d) })), [data]);

  // Buckets for sector counts
  const buckets = useMemo(() => {
    const b = Object.fromEntries(CATEGORIES.map((c) => [c.key, [] as Item[]])) as Record<CategoryKey, Item[]>;
    for (const i of items) {
      if (b[i.bucket].length < 12) b[i.bucket].push(i);
    }
    return b;
  }, [items]);

  // Filtered list taking into account search query, sector filter, and timeline scrub
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((i) => {
      // 1. Text Search Filter
      if (q) {
        const matches = [i.title, i.location, i.category, i.description].some((f) =>
          decodeEntities(f).toLowerCase().includes(q),
        );
        if (!matches) return false;
      }

      // 2. Sector Filter
      if (filter !== 'all' && i.bucket !== filter) {
        return false;
      }

      // 3. Timeline Scrubber Filter (Publication Date)
      if (maxDateTimestamp !== null) {
        const recordTime = i.created_at ? new Date(i.created_at).getTime() : 0;
        if (recordTime > maxDateTimestamp) return false;
      }

      return true;
    });
  }, [items, query, filter, maxDateTimestamp]);

  const selectedItem = useMemo(() => {
    if (!activeSelectedId) return null;
    return items.find((i) => i.id === activeSelectedId) ?? null;
  }, [items, activeSelectedId]);

  const stats = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of items) counts[severityOf(i.severity)]++;
    const top = items.reduce<Item | undefined>(
      (best, i) => (!best || bySeverityThenDate(i, best) < 0 ? i : best),
      undefined,
    );
    return { total: items.length, counts, urgent: counts.critical + counts.high, top };
  }, [items]);

  const filterOptions = useMemo(
    () => [
      { value: 'all' as Filter, label: 'All sectors', count: items.length },
      ...CATEGORIES.map((c) => ({ value: c.key as Filter, label: c.short, count: buckets[c.key]?.length ?? 0 })),
    ],
    [items, buckets],
  );

  return (
    <PageContainer>
      {/* Mobile Pull to Refresh Indicator */}
      {pull > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 top-16 z-20 flex justify-center md:hidden"
          style={{ transform: `translateY(${pull / 3}px)` }}
        >
          <span className="material flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] text-label-2">
            <RefreshCw className="h-3.5 w-3.5" style={{ transform: `rotate(${pull * 2}deg)` }} />
            {pull >= 140 ? 'Release to sync' : 'Pull to sync'}
          </span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Disruption Radar"
        description="Live risk signals from global news. Explore maritime corridors on the interactive radar map, or inspect supply chain alerts."
        actions={
          <>
            <span className={cn('text-[13px]', syncError ? 'text-amber-400 font-medium' : 'text-label-3')} aria-live="polite">
              {syncing ? 'Syncing latest news…' : syncError ? syncError : lastSyncedAt ? `Synced ${relativeTime(lastSyncedAt)}` : null}
            </span>

            {/* View Mode Switcher */}
            <div className="flex rounded-full bg-white/[0.03] backdrop-blur-md border border-white/10 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                  viewMode === 'map'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-white/60 hover:text-white',
                )}
              >
                <Globe2 className={cn('h-3.5 w-3.5', viewMode === 'map' ? 'text-black' : 'text-white/60')} />
                Radar Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                  viewMode === 'grid'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-white/60 hover:text-white',
                )}
              >
                <Grid3X3 className={cn('h-3.5 w-3.5', viewMode === 'grid' ? 'text-black' : 'text-white/60')} />
                Signal Grid
              </button>
            </div>

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
        <InlineError className="mt-6">
          Couldn’t reach Supabase database. Serving cached strategic reference signals for demonstration.
        </InlineError>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Executive Risk Telemetry Summary Strip — Modern Bento Glass   */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-8 grid rounded-2xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-6">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Active Signals Tracked</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">{status === 'loading' ? '–' : stats.total}</p>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
            {SEVERITY_ORDER.map((k) => {
              const colorClass =
                k === 'critical' ? 'bg-white' :
                k === 'high' ? 'bg-white/80' :
                k === 'medium' ? 'bg-white/50' : 'bg-white/20';
              return stats.total && stats.counts[k] ? (
                <div key={k} className={colorClass} style={{ width: `${(stats.counts[k] / stats.total) * 100}%` }} />
              ) : null;
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono">
            {SEVERITY_ORDER.map((k) => `${stats.counts[k]} ${SEVERITY_LABEL[k].toLowerCase()}`).join(' · ')}
          </p>
        </div>
        <div className="p-6">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Need Immediate Attention</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">{status === 'loading' ? '–' : stats.urgent}</p>
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">Critical and high severity bottlenecks across straits & foundries.</p>
        </div>
        <div className="min-w-0 p-6">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Most Exposed Sector</p>
          <p className="mt-2 truncate text-xl font-semibold text-white">{stats.top ? categoryMeta(stats.top.bucket).short : '–'}</p>
          <p className="mt-3 line-clamp-2 text-xs text-slate-400 leading-relaxed">
            {stats.top ? decodeEntities(stats.top.title) : 'Waiting for signals.'}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Primary Filter & Search Bar — Minimal Floating Glass Elements  */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Filter by sector" className="inline-flex gap-1.5 rounded-full bg-white/[0.02] backdrop-blur-md border border-white/[0.06] p-1 shadow-sm">
            {filterOptions.map((o) => {
              const active = query ? false : filter === o.value;
              return (
                <button
                  key={o.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(o.value);
                    setQuery('');
                  }}
                  className={cn(
                    'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-all',
                    active
                      ? 'bg-white text-black shadow-md font-semibold'
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
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search by port, country, material or topic…"
          className="lg:w-80 bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] text-white placeholder:text-slate-400 focus-within:ring-white/20"
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW MODE 1: INTERACTIVE MAP-LED RADAR WORKSPACE             */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'map' && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Main Column: Interactive Radar Map Workspace with soft radial blend */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="relative h-[560px] md:h-[640px] w-full rounded-3xl border border-white/[0.07] overflow-hidden shadow-2xl bg-[#0a0d14]/40 backdrop-blur-md">
                {/* Soft ambient edge gradient/vignette to blend the map container smoothly into the page */}
                <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl ring-1 ring-inset ring-white/[0.08] [box-shadow:inset_0_0_80px_rgba(4,4,6,0.65)]" />
                <RadarMap
                  disruptions={visible}
                  selectedId={activeSelectedId}
                  onSelectDisruption={(item) => setSelectedId(item.id)}
                  showCorridors={showCorridors}
                  onToggleCorridors={() => setShowCorridors((v) => !v)}
                />
              </div>

              {/* Bottom Activity Timeline Scrubber */}
              <ActivityTimeline
                disruptions={items}
                maxDateTimestamp={maxDateTimestamp}
                onChangeMaxDate={setMaxDateTimestamp}
              />
            </div>

            {/* Right Column: Linked Signal Detail Panel & Live Intelligence Feed */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {selectedItem ? (
                <RadarSignalCarousel
                  items={visible.length > 0 ? visible : items}
                  selectedId={activeSelectedId}
                  onSelectSignal={(item) => setSelectedId(item.id)}
                  onClose={() => setSelectedId(null)}
                  isSaved={isSaved}
                  onToggleSave={toggle}
                />
              ) : (
                <div className="flex flex-col h-[720px] rounded-3xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] overflow-hidden shadow-2xl">
                  {/* Tab Selector: Live Signals vs Daily AI Brief */}
                  <div className="flex border-b border-white/[0.07] p-2 gap-2 bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setSidebarTab('feed')}
                      className={cn(
                        'flex-1 rounded-xl py-2 text-[13px] font-medium transition-all text-center',
                        sidebarTab === 'feed'
                          ? 'bg-white text-black font-semibold shadow-md'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white',
                      )}
                    >
                      Filtered Signals ({visible.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidebarTab('brief')}
                      className={cn(
                        'flex-1 rounded-xl py-2 text-[13px] font-medium transition-all text-center',
                        sidebarTab === 'brief'
                          ? 'bg-white text-black font-semibold shadow-md'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white',
                      )}
                    >
                      Executive Brief
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {sidebarTab === 'feed' ? (
                      visible.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                          <Compass className="h-8 w-8 text-white/40" />
                          <p className="mt-3 text-[14px] font-medium text-white">No matching signals</p>
                          <p className="mt-1 text-[12px] text-white/60">
                            Try adjusting your timeline slider, sector filter, or search query.
                          </p>
                          {(query || filter !== 'all' || maxDateTimestamp !== null) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-4"
                              onClick={() => {
                                setQuery('');
                                setFilter('all');
                                setMaxDateTimestamp(null);
                              }}
                            >
                              Reset all filters
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedId(visible[0]?.id ?? null)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3 py-2.5 text-xs font-medium text-white/90 hover:text-white transition-all shadow-sm"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                            <span>Launch 3D Orbit Carousel ({visible.length})</span>
                          </button>
                          {visible.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={cn(
                              'group cursor-pointer rounded-2xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] p-4 transition-all hover:bg-white/[0.06] hover:border-white/15 shadow-xl',
                              selectedId === item.id && 'border-white/40 ring-1 ring-white/30 bg-white/10 shadow-2xl',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider bg-white/[0.06] text-white border border-white/10">
                                {item.severity ?? 'Medium'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {categoryMeta(item.bucket).short}
                              </span>
                            </div>

                            <h4 className="mt-2.5 text-[13px] font-medium text-white leading-snug line-clamp-2 transition-colors">
                              {decodeEntities(item.title)}
                            </h4>

                            {item.location && (
                              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                                <MapPin className="h-3 w-3 shrink-0 text-white/40" />
                                {decodeEntities(item.location)}
                              </p>
                            )}
                          </div>
                        ))}
                      </>
                    )
                  ) : (
                      <DailyBrief data={data} ready={status === 'ready' && !syncing} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW MODE 2: CLASSIC SIGNAL GRID VIEW                        */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'grid' && (
        <div className="mt-8 space-y-8">
          <DailyBrief data={data} ready={status === 'ready' && !syncing} />

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
                description={
                  query
                    ? 'Try a country, a material or a company name.'
                    : 'Sync to pull the latest supply chain news.'
                }
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
                  <SignalCard
                    key={item.id}
                    item={item}
                    saved={isSaved(item.id)}
                    onToggleSave={toggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
