'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUp,
  ArrowRight,
  Sparkles,
  MapPin,
  RotateCw,
  Radar,
  ShieldAlert,
  AlertTriangle,
  Cpu,
  Ship,
  TrendingUp,
  Globe2,
} from 'lucide-react';
import { useDisruptions } from '@/lib/useDisruptions';
import {
  Disruption,
  bySeverityThenDate,
  categorize,
  categoryMeta,
  imageFor,
  severityOf,
  CategoryKey,
  CATEGORIES,
} from '@/lib/disruptions';
import { decodeEntities, relativeTime, parseImpact } from '@/lib/text';
import { NAV_ITEMS } from '@/components/shell/nav';
import { PageContainer } from '@/components/ui/PageHeader';
import { SectionHeading } from '@/components/ui/Card';
import { DeckCarousel } from '@/components/ui/DeckCarousel';
import { cn } from '@/components/ui/cn';

const EXAMPLE_QUESTIONS = [
  'What is the risk status of semiconductor imports?',
  'How will Red Sea shipping delays affect lead times?',
  'Which raw materials are getting more expensive?',
];

const TOOL_HREFS = ['/impact-copilot', '/chat', '/startup-advisor'];

const CATEGORY_ICON: Record<CategoryKey, React.ComponentType<{ className?: string }>> = {
  'AI Chips & Core Tech Hardware': Cpu,
  'Logistics & Freight Volatility': Ship,
  'Price Spikes & Raw Material Inflation': TrendingUp,
  'Corporate Policy & Supply Shifts': Globe2,
};

function getSeverityBadge(severity?: string | null) {
  const s = severityOf(severity);
  switch (s) {
    case 'critical':
      return {
        label: 'Critical',
        classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
        dot: 'bg-rose-400',
      };
    case 'high':
      return {
        label: 'High Risk',
        classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        dot: 'bg-amber-400',
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        classes: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
        dot: 'bg-cyan-400',
      };
    default:
      return {
        label: 'Low Risk',
        classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30 shadow-none',
        dot: 'bg-slate-400',
      };
  }
}

const noopSubscribe = () => () => {};
const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** Client-only date (avoids a server/client hydration mismatch). */
function useToday() {
  return useSyncExternalStore(noopSubscribe, todayLabel, () => '');
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const today = useToday();
  const { data, status, sync } = useDisruptions();
  const [question, setQuestion] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const urgent = useMemo(() => data.filter((d) => ['critical', 'high'].includes(severityOf(d.severity))), [data]);

  const urgentSignals = useMemo(() => {
    const sorted = [...data].sort(bySeverityThenDate);
    const criticalAndHigh = sorted.filter((d) => ['critical', 'high'].includes(severityOf(d.severity)));
    const base = criticalAndHigh.length > 0 ? criticalAndHigh : sorted.slice(0, 10);

    if (categoryFilter === 'all') return base;
    return base.filter((d) => categorize(d) === categoryFilter);
  }, [data, categoryFilter]);

  const activeSignal = urgentSignals[Math.min(focusedIndex, Math.max(0, urgentSignals.length - 1))] || null;

  const ask = (q: string) => {
    const text = q.trim();
    if (text) router.push(`/chat?query=${encodeURIComponent(text)}`);
  };

  return (
    <PageContainer className="max-w-5xl py-4 sm:py-8">
      {/* Hero */}
      <section className="pt-2 md:pt-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 px-3.5 py-1 text-xs font-mono text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {today || 'Global Telemetry Active'}
          </span>
        </div>

        <h1 className="mt-4 max-w-3xl text-display font-medium text-white tracking-tight">
          {status !== 'ready' ? (
            <>
              See disruptions <span className="font-serif italic font-normal text-white/90">before</span> they reach your business.
            </>
          ) : urgent.length === 0 ? (
            <>
              All monitored supply corridors <span className="font-serif italic font-normal text-white/90">currently stable</span>.
            </>
          ) : (
            <>
              {urgent.length} critical {urgent.length === 1 ? 'disruption requires' : 'disruptions require'}{' '}
              <span className="font-serif italic font-normal text-white/90">strategic mitigation</span>.
            </>
          )}
        </h1>

        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-300">
          Supply Connect tracks ports, semiconductor fabrication, raw material inflation, and trade barriers worldwide,
          projecting upstream volatility into prioritized operational actions.
        </p>

        {/* AI Query Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-[#0a0d14]/60 backdrop-blur-md border border-white/[0.09] p-1.5 pl-5 shadow-2xl focus-within:ring-2 focus-within:ring-white/30"
        >
          <Sparkles className="h-4 w-4 text-white/50 shrink-0" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Supply AI about a port, component shortage, or supplier route…"
            aria-label="Ask Supply AI"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Submit query"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black font-semibold transition-all hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="mt-3.5 flex max-w-2xl flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Suggested:</span>
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-3.5 py-1 text-xs text-white/75 hover:text-white transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Modern Bento Stat Strip */}
        <div className="mt-10 grid rounded-2xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-6">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Signals Ingested</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
              {status === 'loading' ? '—' : data.length}
            </p>
            <p className="mt-2 text-xs text-slate-400">Global trade & maritime news nodes</p>
          </div>
          <div className="p-6">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">High-Risk Bottlenecks</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
              {status === 'loading' ? '—' : urgent.length}
            </p>
            <p className="mt-2 text-xs text-slate-400">Impacting straits, foundries & freight</p>
          </div>
          <div className="p-6">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Corridor Telemetry</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">Active</p>
            <p className="mt-2 text-xs text-slate-400">Real-time predictive early warning</p>
          </div>
        </div>
      </section>

      {/* Highest risk section featuring 3D Deck Carousel */}
      <section className="mt-14 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
                Priority Telemetry Deck
              </span>
              <span className="rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                {urgentSignals.length} prioritized
              </span>
            </div>
            <h2 className="mt-1.5 text-2xl font-medium tracking-tight text-white">
              Highest risk right now
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Interactive 3D physics deck fanning urgent supply disruptions ranked by operational severity
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-md border border-white/10 px-4 py-1.5 text-xs font-medium text-white/90 hover:text-white transition-all shadow-sm"
            >
              <span>Open radar</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Floating Translucent Category Filter Pills */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setFocusedIndex(0);
            }}
            className={cn(
              'rounded-full px-3.5 py-1 text-xs font-medium transition-all backdrop-blur-md border',
              categoryFilter === 'all'
                ? 'bg-white text-black border-white shadow-sm font-semibold'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-white/80'
            )}
          >
            All Priority ({urgent.length})
          </button>
          {CATEGORIES.map((cat) => {
            const catCount = urgent.filter((d) => categorize(d) === cat.key).length;
            if (catCount === 0) return null;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.key);
                  setFocusedIndex(0);
                }}
                className={cn(
                  'rounded-full px-3.5 py-1 text-xs font-medium transition-all backdrop-blur-md border',
                  categoryFilter === cat.key
                    ? 'bg-white text-black border-white shadow-sm font-semibold'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-white/80'
                )}
              >
                {cat.short} ({catCount})
              </button>
            );
          })}
        </div>

        {/* Dynamic State Rendering */}
        {status === 'loading' ? (
          <div className="my-12 flex h-72 items-center justify-center rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/[0.06]">
            <div className="flex flex-col items-center gap-3 text-center">
              <RotateCw className="h-6 w-6 animate-spin text-white/70" />
              <p className="text-xs font-mono text-slate-400">Streaming priority telemetry into 3D deck…</p>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="my-12 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-400/80" />
            <h3 className="mt-3 text-sm font-medium text-white">Unable to Load Priority Signals</h3>
            <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto">
              Couldn’t connect to live disruption data. Retry synchronization or explore the map.
            </p>
            <button
              onClick={sync}
              className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : urgentSignals.length === 0 ? (
          <div className="my-12 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-white/40" />
            <h3 className="mt-3 text-sm font-medium text-white">No Critical Risks in Selected Filter</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              All monitored logistics corridors and tech supply chains in this category are currently stable.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {/* 3D Deck Carousel floating directly over the WebGL background */}
            <DeckCarousel<Disruption>
              items={urgentSignals}
              activeIndex={focusedIndex}
              onActiveIndexChange={setFocusedIndex}
              cardWidth={305}
              cardHeight={410}
              cardRadius={16}
              gap={210}
              showControls={true}
              renderCard={(item, idx, isCenter) => {
                const badge = getSeverityBadge(item.severity);
                const bucket = categorize(item);
                const CatIcon = CATEGORY_ICON[bucket] || Globe2;
                const impactParts = parseImpact(item.impact);
                const actionText = impactParts[0]?.text || item.description || 'Active telemetry monitored.';

                return (
                  <div className="relative h-full w-full rounded-2xl border border-white/10 bg-[#0a0d18]/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between text-left select-none">
                    {/* Top: Risk badge, location, timestamp */}
                    <div className="p-3.5 flex items-center justify-between gap-2 z-10 border-b border-white/[0.06] bg-black/30">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                          badge.classes
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', badge.dot)} />
                        {badge.label}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        {item.location && (
                          <span className="flex items-center gap-1 max-w-[100px] truncate text-slate-300">
                            <MapPin className="h-3 w-3 shrink-0 text-white/50" />
                            <span className="truncate">{decodeEntities(item.location)}</span>
                          </span>
                        )}
                        {item.created_at && <span>{relativeTime(item.created_at)}</span>}
                      </div>
                    </div>

                    {/* Center: Image with gradient overlay and category badge */}
                    <div className="relative flex-1 min-h-[140px] w-full overflow-hidden bg-black/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageFor(item, bucket)}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d18] via-[#0a0d18]/40 to-transparent" />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white/90">
                        <CatIcon className="h-3 w-3 text-white/70" />
                        <span>{categoryMeta(bucket).short}</span>
                      </div>
                    </div>

                    {/* Bottom: Headline, corridor/sector, recommended mitigation action */}
                    <div className="p-4 pt-2.5 flex flex-col gap-2.5 z-10 bg-gradient-to-t from-[#0a0d18] to-transparent">
                      <div>
                        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                          {decodeEntities(item.title)}
                        </h3>
                      </div>

                      <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-2.5 text-xs text-slate-300">
                        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                          <Sparkles className="h-2.5 w-2.5 text-amber-300/80" />
                          <span>Recommended Mitigation</span>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-300">
                          {decodeEntities(actionText)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Synchronized Floating Action Dock */}
            {activeSignal && (
              <div className="mt-6 rounded-2xl bg-[#0a0d18]/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-2xl transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px]">
                        Focused Deck Signal #{focusedIndex + 1} of {urgentSignals.length}
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="text-slate-300 font-medium">
                        {activeSignal.location || categoryMeta(categorize(activeSignal)).short}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-medium text-white tracking-tight leading-snug line-clamp-1">
                      {decodeEntities(activeSignal.title)}
                    </h4>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {decodeEntities(
                        activeSignal.description ||
                          parseImpact(activeSignal.impact)[0]?.text ||
                          'Continuous supply telemetry active.'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <Link
                      href={`/explore?highlight=${activeSignal.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition-all hover:bg-white/90 shadow-lg active:scale-95"
                    >
                      <Radar className="h-3.5 w-3.5" />
                      <span>Investigate on Radar</span>
                    </Link>
                    <Link
                      href={`/startup-advisor?id=${activeSignal.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 px-4 py-2.5 text-xs font-medium text-white transition-all shadow-md active:scale-95"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-300/80" />
                      <span>Plan Response</span>
                    </Link>
                    <Link
                      href={`/impact-copilot?disruptionId=${activeSignal.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 px-4 py-2.5 text-xs font-medium text-white transition-all shadow-md active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-cyan-300/80" />
                      <span>Analyze with AI</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tools: Plan a response */}
      <section className="mt-14 pb-12 min-w-0">
        <SectionHeading
          title="Plan a response"
          description="Autonomous AI intelligence workflows and mitigation playbooks"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {NAV_ITEMS.filter((n) => TOOL_HREFS.includes(n.href)).map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col justify-between rounded-3xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] p-6 shadow-2xl transition-all hover:border-white/20 hover:bg-[#0e121d]/70"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white group-hover:scale-105 transition-transform">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-white">
                  {label}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
                  {description}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.07] flex items-center justify-between text-[11px] font-mono text-slate-400 group-hover:text-white/80 transition-colors">
                <span>Launch workflow</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
