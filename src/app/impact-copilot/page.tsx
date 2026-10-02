// src/app/impact-copilot/page.tsx
'use client';

import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, ArrowDown, ArrowRight, Clock, Cpu, Layers, Loader2, Minus, Network,
  RefreshCw, ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, X, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';
import {
  ImpactAnalysis, ImpactNode, LEVEL_ORDER, LevelKey, Priority, Severity, normalizeAnalysis,
} from '@/lib/impact-schema';
import { stashImpactContext } from '@/lib/share-context';

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

const LEVEL_THEME: Record<LevelKey, {
  label: string; hex: string; text: string; border: string; chip: string; bar: string; Icon: React.ElementType;
}> = {
  macro: { label: 'Level 1', hex: '#f87171', text: 'text-red-400', border: 'border-red-500/30', chip: 'bg-red-950 text-red-300 border-red-900', bar: 'bg-red-500', Icon: AlertTriangle },
  regional: { label: 'Level 2', hex: '#fbbf24', text: 'text-amber-400', border: 'border-amber-500/30', chip: 'bg-amber-950 text-amber-300 border-amber-900', bar: 'bg-amber-500', Icon: Zap },
  direct: { label: 'Level 3', hex: '#34d399', text: 'text-emerald-400', border: 'border-emerald-500/30', chip: 'bg-emerald-950 text-emerald-300 border-emerald-800', bar: 'bg-emerald-500', Icon: Target },
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
  high: 'bg-orange-400',
  medium: 'bg-amber-300',
  low: 'bg-emerald-400',
};

const PRIORITY_CHIP: Record<Priority, string> = {
  P0: 'bg-red-950 text-red-300 border-red-800',
  P1: 'bg-amber-950 text-amber-300 border-amber-800',
  P2: 'bg-sky-950 text-sky-300 border-sky-800',
};

const LOADING_STEPS = [
  'Reading the global signal…',
  'Tracing regional bottlenecks…',
  'Mapping impact onto your domain…',
  'Drafting the mitigation playbook…',
];

const EXAMPLES = ['Hardware Manufacturing', 'EV Battery Startup', 'Pharma Distribution', 'D2C Apparel Brand'];

const decodeHtmlEntities = (str: string) =>
  (str ?? '')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/* ------------------------------------------------------------------ */
/* Risk gauge                                                          */
/* ------------------------------------------------------------------ */

function RiskGauge({ score }: { score: number }) {
  const r = 52;
  const len = Math.PI * r;
  const color = score >= 75 ? '#f87171' : score >= 50 ? '#fbbf24' : '#34d399';
  const label = score >= 75 ? 'Severe' : score >= 50 ? 'Elevated' : 'Moderate';
  const arc = 'M12 68 A52 52 0 0 1 116 68';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 128 78" className="w-44">
        <path d={arc} fill="none" stroke="#262626" strokeWidth="10" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(len * score) / 100} ${len}`}
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="64" y="62" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="700">{score}</text>
      </svg>
      <span className="-mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label} risk</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cascading flowchart — real nodes + SVG connectors                   */
/* ------------------------------------------------------------------ */

type Path = { d: string; from: string; to: string; fromHex: string; toHex: string; key: string };

function CascadeFlowchart({
  data, selectedId, onSelect,
}: { data: ImpactAnalysis; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const levelOf = useMemo(() => {
    const m = new Map<string, LevelKey>();
    LEVEL_ORDER.forEach((k) => data.levels[k].nodes.forEach((n) => m.set(n.id, k)));
    return m;
  }, [data]);

  const compute = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const rectOf = (id: string) => c.querySelector<HTMLElement>(`[data-node-id="${id}"]`)?.getBoundingClientRect();

    const out: Path[] = [];
    data.links.forEach((l, i) => {
      const a = rectOf(l.from);
      const b = rectOf(l.to);
      if (!a || !b) return;
      const x1 = a.right - cr.left;
      const y1 = a.top + a.height / 2 - cr.top;
      const x2 = b.left - cr.left;
      const y2 = b.top + b.height / 2 - cr.top;
      const dx = (x2 - x1) / 2;
      out.push({
        key: `p${i}`,
        from: l.from,
        to: l.to,
        d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
        fromHex: LEVEL_THEME[levelOf.get(l.from)!].hex,
        toHex: LEVEL_THEME[levelOf.get(l.to)!].hex,
      });
    });
    setBox({ w: cr.width, h: cr.height });
    setPaths(out);
  }, [data, levelOf]);

  useLayoutEffect(() => {
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [compute]);

  const focus = hovered ?? selectedId;
  const chain = useMemo(() => {
    if (!focus) return null;
    const s = new Set([focus]);
    const walk = (dir: 'down' | 'up') => {
      const stack = [focus];
      while (stack.length) {
        const x = stack.pop()!;
        data.links.forEach((l) => {
          const [src, dst] = dir === 'down' ? [l.from, l.to] : [l.to, l.from];
          if (src === x && !s.has(dst)) { s.add(dst); stack.push(dst); }
        });
      }
    };
    walk('down');
    walk('up');
    return s;
  }, [focus, data.links]);

  return (
    <div ref={containerRef} className="relative">
      <style>{`@keyframes flowdash { to { stroke-dashoffset: -24; } }`}</style>

      <svg className="pointer-events-none absolute inset-0 hidden md:block" width={box.w} height={box.h}>
        <defs>
          {paths.map((p) => (
            <linearGradient key={p.key} id={`g-${p.key}`} x1="0%" x2="100%">
              <stop offset="0%" stopColor={p.fromHex} />
              <stop offset="100%" stopColor={p.toHex} />
            </linearGradient>
          ))}
        </defs>
        {paths.map((p) => {
          const on = !chain || (chain.has(p.from) && chain.has(p.to));
          return (
            <g key={p.key} style={{ opacity: on ? 1 : 0.08, transition: 'opacity .25s' }}>
              <path d={p.d} fill="none" stroke={`url(#g-${p.key})`} strokeWidth={on && chain ? 3 : 2} strokeOpacity={0.35} />
              <path
                d={p.d}
                fill="none"
                stroke={`url(#g-${p.key})`}
                strokeWidth={on && chain ? 3 : 2}
                strokeDasharray="6 6"
                style={{ animation: 'flowdash 1s linear infinite' }}
              />
            </g>
          );
        })}
      </svg>

      <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-20">
        {LEVEL_ORDER.map((key, li) => {
          const level = data.levels[key];
          const t = LEVEL_THEME[key];
          return (
            <div key={key} className="flex flex-col gap-3">
              <div className={`relative overflow-hidden rounded-2xl border ${t.border} bg-neutral-900/90 p-4`}>
                <div className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${t.chip}`}>{t.label}</span>
                  <t.Icon className={`h-4 w-4 ${t.text}`} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-white">{level.title}</h3>
                {level.summary && <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{level.summary}</p>}
              </div>

              {level.nodes.map((n) => (
                <FlowNode
                  key={n.id}
                  node={n}
                  levelKey={key}
                  dimmed={!!chain && !chain.has(n.id)}
                  selected={selectedId === n.id}
                  onHover={setHovered}
                  onClick={() => onSelect(selectedId === n.id ? null : n.id)}
                />
              ))}

              {li < LEVEL_ORDER.length - 1 && (
                <div className="flex justify-center py-1 md:hidden">
                  <ArrowDown className="h-5 w-5 animate-bounce text-neutral-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowNode({
  node, levelKey, dimmed, selected, onHover, onClick,
}: {
  node: ImpactNode; levelKey: LevelKey; dimmed: boolean; selected: boolean;
  onHover: (id: string | null) => void; onClick: () => void;
}) {
  const t = LEVEL_THEME[levelKey];
  return (
    <button
      type="button"
      data-node-id={node.id}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
      onClick={onClick}
      className={`group w-full rounded-xl border bg-gradient-to-br from-neutral-900 to-neutral-950 p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
        selected ? 'ring-2 ring-offset-2 ring-offset-neutral-950' : ''
      } ${dimmed ? 'opacity-30' : 'opacity-100'} ${t.border}`}
      style={selected ? ({ '--tw-ring-color': t.hex, boxShadow: `0 0 24px ${t.hex}33` } as React.CSSProperties) : undefined}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[node.severity]}`} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{node.title}</p>
          {node.detail && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-neutral-400">{node.detail}</p>}
          <span className="mt-2 inline-block text-[9px] font-bold uppercase tracking-wider text-neutral-500">{node.severity}</span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Node detail drawer                                                  */
/* ------------------------------------------------------------------ */

function NodeDetail({ data, id, onClose }: { data: ImpactAnalysis; id: string; onClose: () => void }) {
  const all = LEVEL_ORDER.flatMap((k) => data.levels[k].nodes.map((n) => ({ ...n, level: k })));
  const node = all.find((n) => n.id === id);
  if (!node) return null;
  const t = LEVEL_THEME[node.level];
  const name = (nid: string) => all.find((n) => n.id === nid)?.title ?? nid;
  const upstream = data.links.filter((l) => l.to === id);
  const downstream = data.links.filter((l) => l.from === id);

  return (
    <div className={`rounded-2xl border ${t.border} bg-neutral-900 p-5 shadow-2xl`}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${t.chip}`}>{t.label} · {node.severity}</span>
          <h4 className="mt-2 text-sm font-bold text-white">{node.title}</h4>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs leading-relaxed text-neutral-300">{node.detail}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[{ title: 'Caused by', items: upstream.map((l) => ({ n: name(l.from), label: l.label })) },
          { title: 'Leads to', items: downstream.map((l) => ({ n: name(l.to), label: l.label })) }].map((col) => (
          <div key={col.title} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{col.title}</p>
            {col.items.length === 0 ? (
              <p className="text-[11px] text-neutral-600">—</p>
            ) : (
              <ul className="space-y-1.5">
                {col.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-neutral-300">
                    <ArrowRight className="h-3 w-3 shrink-0 text-neutral-500" />
                    <span className="font-semibold">{it.n}</span>
                    {it.label && <span className="text-neutral-500">· {it.label}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Playbook timeline                                                   */
/* ------------------------------------------------------------------ */

function Playbook({ data }: { data: ImpactAnalysis }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {data.playbook.map((ph, i) => (
        <div key={i} className="relative rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
          {i < data.playbook.length - 1 && (
            <ArrowRight className="absolute -right-4 top-8 z-10 hidden h-5 w-5 text-emerald-500/60 lg:block" />
          )}
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-sm font-black text-neutral-950 shadow-lg shadow-emerald-500/30">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-bold text-white">{ph.phase}</p>
              <p className="flex items-center gap-1 text-[11px] text-neutral-400"><Clock className="h-3 w-3" /> {ph.horizon}</p>
            </div>
          </div>
          <ol className="space-y-3 border-l border-neutral-800 pl-4">
            {ph.actions.map((a, j) => (
              <li key={j} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-neutral-700 ring-4 ring-neutral-900" />
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{a.title}</p>
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${PRIORITY_CHIP[a.priority]}`}>{a.priority}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-neutral-400">{a.detail}</p>
                  {a.owner && <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Owner · {a.owner}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ImpactCopilotContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const disruptionId = searchParams.get('id');
  const initialQuery = searchParams.get('query');

  const [disruption, setDisruption] = useState<any>(null);
  const [contextReady, setContextReady] = useState(false);
  const [profession, setProfession] = useState(initialQuery || '');
  const [submitted, setSubmitted] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);
  const [error, setError] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const autoRan = useRef(false);

  useEffect(() => {
    (async () => {
      if (disruptionId) {
        try {
          const { data } = await supabase.from('disruptions').select('*').eq('id', disruptionId).single();
          if (data) setDisruption(data);
        } catch (e) {
          console.error(e);
        }
      }
      setContextReady(true);
    })();
  }, [disruptionId]);

  useEffect(() => {
    if (!analyzing) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, [analyzing]);

  const runAnalysis = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('query', q);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    setSubmitted(q);
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setSelectedId(null);

    try {
      const res = await fetch('/api/impact-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfession: q, disruptionContext: disruption }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(normalizeAnalysis(data.analysis));
        setActiveModel(data.modelUsed ?? '');
      } else {
        setError(data.error ?? 'Could not generate analysis.');
      }
    } catch (e) {
      console.error(e);
      setError('Connection error with AI router.');
    } finally {
      setAnalyzing(false);
    }
  }, [disruption, pathname, router, searchParams]);

  // Auto-run when arriving with ?query=
  useEffect(() => {
    if (contextReady && initialQuery && !autoRan.current) {
      autoRan.current = true;
      runAnalysis(initialQuery);
    }
  }, [contextReady, initialQuery, runAnalysis]);

  const askSupplyAI = () => {
    if (!analysis) return;
    stashImpactContext({
      profession: submitted,
      disruptionId: disruption?.id ? String(disruption.id) : undefined,
      disruptionTitle: disruption?.title ? decodeHtmlEntities(disruption.title) : undefined,
      analysis,
    });
    router.push('/chat?from=impact');
  };

  const reset = () => {
    setAnalysis(null);
    setError('');
    setProfession('');
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('query');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100 selection:bg-emerald-500 selection:text-neutral-950">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[1000px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:22px_22px]" />

      <TopNav
        right={
          activeModel ? (
            <span className="hidden items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 font-mono text-[10px] text-neutral-400 sm:flex">
              <Cpu className="h-3 w-3 text-emerald-400" /> {activeModel}
            </span>
          ) : null
        }
      />

      <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-10">
        {/* Page title — centered */}
        <div className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-lg font-bold text-white sm:text-2xl">
            <Network className="h-5 w-5 text-emerald-400" /> Personalized Resilience & Impact Engine
          </h1>
          <p className="mx-auto mt-1 max-w-xl text-xs text-neutral-400 sm:text-sm">
            Cascading impact flowchart and a targeted mitigation playbook for your domain.
          </p>
        </div>

        {disruption && (
          <div className="mx-auto flex max-w-3xl items-start gap-4 rounded-2xl border border-amber-500/20 bg-neutral-900/90 p-5 shadow-2xl">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Active Global Signal</span>
              <h3 className="text-sm font-bold text-white">{decodeHtmlEntities(disruption.title)}</h3>
              <p className="text-neutral-300">{decodeHtmlEntities(disruption.impact)}</p>
            </div>
          </div>
        )}

        {/* ---------- Input ---------- */}
        {!analysis && !analyzing && (
          <div className="mx-auto mt-6 max-w-xl space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-8 text-center shadow-2xl">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-emerald-800 bg-emerald-950 text-emerald-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-bold text-white">What is your profession or active project?</h2>
              <p className="text-xs text-neutral-400">We'll map the global shock down to your workflow and build the flowchart.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); runAnalysis(profession); }} className="space-y-4">
              <input
                type="text"
                placeholder="e.g., Hardware Manufacturing, SaaS Supply Chain…"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => setProfession(ex)} className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11px] text-neutral-400 transition hover:border-emerald-700 hover:text-emerald-300">
                    {ex}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!profession.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate Flowchart & Playbook <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            {error && <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-300">{error}</p>}
          </div>
        )}

        {/* ---------- Loading skeleton ---------- */}
        {analyzing && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs font-semibold text-neutral-300">{LOADING_STEPS[step]}</p>
              <div className="flex gap-1.5">
                {LOADING_STEPS.map((_, i) => (
                  <span key={i} className={`h-1 w-8 rounded-full transition ${i <= step ? 'bg-emerald-500' : 'bg-neutral-800'}`} />
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3 md:gap-20">
              {LEVEL_ORDER.map((k) => (
                <div key={k} className="space-y-3">
                  <div className={`h-24 animate-pulse rounded-2xl border ${LEVEL_THEME[k].border} bg-neutral-900`} />
                  <div className="h-16 animate-pulse rounded-xl bg-neutral-900" />
                  <div className="h-16 animate-pulse rounded-xl bg-neutral-900" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------- Result ---------- */}
        {analysis && !analyzing && (
          <div className="space-y-8">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs text-neutral-400">Target profile</span>
              <span className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-400">{submitted}</span>
              <button onClick={reset} className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white">
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" /> New Analysis
              </button>
              <button onClick={askSupplyAI} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-neutral-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                <Sparkles className="h-3.5 w-3.5" /> Ask Supply AI
              </button>
            </div>

            {/* Executive strip */}
            <section className="grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-2xl lg:grid-cols-[auto_1fr]">
              <div className="flex justify-center lg:border-r lg:border-neutral-800 lg:pr-8">
                <RiskGauge score={analysis.riskScore} />
              </div>
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white sm:text-xl">{analysis.headline}</h2>
                  {analysis.exposure && <p className="mt-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">{analysis.exposure}</p>}
                </div>
                {analysis.metrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {analysis.metrics.map((m, i) => {
                      const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
                      const tone = m.trend === 'up' ? 'text-red-400' : m.trend === 'down' ? 'text-emerald-400' : 'text-neutral-400';
                      return (
                        <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-neutral-500">{m.label}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white">
                            {m.value} <TrendIcon className={`h-3.5 w-3.5 ${tone}`} />
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Flowchart */}
            <section className="space-y-4">
              <div className="text-center">
                <h2 className="flex items-center justify-center gap-2 text-base font-bold text-white">
                  <Zap className="h-5 w-5 text-emerald-400" /> Cascading Impact Flowchart
                </h2>
                <p className="mt-1 text-[11px] text-neutral-500">Hover a node to trace its chain · click for details</p>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 sm:p-6">
                <CascadeFlowchart data={analysis} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              {selectedId && <NodeDetail data={analysis} id={selectedId} onClose={() => setSelectedId(null)} />}
            </section>

            {/* Playbook */}
            {analysis.playbook.length > 0 && (
              <section className="space-y-4">
                <h2 className="flex items-center justify-center gap-2 text-base font-bold text-white">
                  <ShieldAlert className="h-5 w-5 text-emerald-400" /> Mitigation Playbook
                </h2>
                <Playbook data={analysis} />
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ImpactCopilotPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-neutral-950 text-emerald-400"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ImpactCopilotContent />
    </Suspense>
  );
}






