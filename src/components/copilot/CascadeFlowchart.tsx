'use client';

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { ImpactAnalysis, ImpactNode, LEVEL_ORDER, LevelKey } from '@/lib/impact-schema';
import { cn } from '@/components/ui/cn';
import { LEVEL_THEME } from './theme';

type Path = { d: string; from: string; to: string; fromHex: string; toHex: string; key: string; x1: number; x2: number };

/** Three columns of nodes with live SVG connectors. Hover traces a chain; click opens details. */
export function CascadeFlowchart({
  data,
  selectedId,
  onSelect,
}: {
  data: ImpactAnalysis;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
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
    const rectOf = (id: string) => c.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();

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
        x1,
        x2,
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
    return () => ro.disconnect();
  }, [compute]);

  // Full upstream + downstream chain of the focused node.
  const focus = hovered ?? selectedId;
  const chain = useMemo(() => {
    if (!focus) return null;
    const s = new Set([focus]);
    const walk = (dir: 'down' | 'up') => {
      const stack = [focus];
      while (stack.length) {
        const x = stack.pop()!;
        for (const l of data.links) {
          const [src, dst] = dir === 'down' ? [l.from, l.to] : [l.to, l.from];
          if (src === x && !s.has(dst)) {
            s.add(dst);
            stack.push(dst);
          }
        }
      }
    };
    walk('down');
    walk('up');
    return s;
  }, [focus, data.links]);

  return (
    <div ref={containerRef} className="relative">
      <style>{`@keyframes sc-flow { to { stroke-dashoffset: -24; } }`}</style>

      <svg className="pointer-events-none absolute inset-0 hidden md:block" width={box.w} height={box.h} aria-hidden>
        <defs>
          {paths.map((p) => (
            // userSpaceOnUse: a perfectly horizontal path has a zero-height bounding box,
            // which makes objectBoundingBox gradients render nothing.
            <linearGradient key={p.key} id={`g-${p.key}`} gradientUnits="userSpaceOnUse" x1={p.x1} y1={0} x2={p.x2} y2={0}>
              <stop offset="0%" stopColor={p.fromHex} />
              <stop offset="100%" stopColor={p.toHex} />
            </linearGradient>
          ))}
        </defs>
        {paths.map((p) => {
          const on = !chain || (chain.has(p.from) && chain.has(p.to));
          return (
            <g key={p.key} style={{ opacity: on ? 1 : 0.08, transition: 'opacity .2s' }}>
              <path d={p.d} fill="none" stroke={`url(#g-${p.key})`} strokeWidth={on && chain ? 2.5 : 1.5} strokeOpacity={0.3} />
              <path
                d={p.d}
                fill="none"
                stroke={`url(#g-${p.key})`}
                strokeWidth={on && chain ? 2.5 : 1.5}
                strokeDasharray="6 6"
                style={{ animation: 'sc-flow 1.2s linear infinite' }}
              />
            </g>
          );
        })}
      </svg>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-16">
        {LEVEL_ORDER.map((key, li) => {
          const level = data.levels[key];
          const t = LEVEL_THEME[key];
          return (
            <div key={key} className="flex flex-col gap-3">
              <div className="px-1 pb-1">
                <p className={cn('flex items-center gap-1.5 text-[13px] font-medium', t.text)}>
                  <t.Icon className="h-3.5 w-3.5" /> {t.label}, {t.name.toLowerCase()}
                </p>
                <h3 className="mt-1 text-headline">{level.title}</h3>
                {level.summary && <p className="mt-1 text-[13px] leading-relaxed text-label-2">{level.summary}</p>}
              </div>

              {level.nodes.map((n) => (
                <FlowNode
                  key={n.id}
                  node={n}
                  dimmed={!!chain && !chain.has(n.id)}
                  selected={selectedId === n.id}
                  onHover={setHovered}
                  onClick={() => onSelect(selectedId === n.id ? null : n.id)}
                />
              ))}

              {li < LEVEL_ORDER.length - 1 && (
                <div className="flex justify-center py-1 md:hidden" aria-hidden>
                  <ArrowDown className="h-5 w-5 text-label-3" />
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
  node,
  dimmed,
  selected,
  onHover,
  onClick,
}: {
  node: ImpactNode;
  dimmed: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}) {
  const sevDot =
    node.severity === 'critical' ? 'bg-white' :
    node.severity === 'high' ? 'bg-white/80' :
    node.severity === 'medium' ? 'bg-white/50' : 'bg-white/25';

  return (
    <button
      type="button"
      data-node-id={node.id}
      aria-pressed={selected}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl p-4 text-left transition-all duration-200',
        selected
          ? 'bg-[#0e121d]/75 backdrop-blur-lg border border-white/20 ring-1 ring-white/40 shadow-2xl'
          : 'bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/15 shadow-xl',
        dimmed ? 'opacity-30' : 'opacity-100',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span aria-hidden className={cn('mt-[7px] h-2 w-2 shrink-0 rounded-full', sevDot)} />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-white">{node.title}</p>
          {node.detail && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/70">{node.detail}</p>}
          <p className="mt-2 text-[11px] font-mono uppercase tracking-wider text-white/50">{node.severity} risk</p>
        </div>
      </div>
    </button>
  );
}
