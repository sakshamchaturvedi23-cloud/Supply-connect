// src/components/chat/ImpactContextCard.tsx
// Visual "attachment" card shown inside the user's message instead of a raw JSON dump.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Network } from 'lucide-react';
import { LEVEL_ORDER, LevelKey, Severity } from '@/lib/impact-schema';
import { ImpactAttachment } from '@/lib/share-context';

const LEVEL_STYLE: Record<LevelKey, { name: string; dot: string; text: string; border: string }> = {
  macro: { name: 'Macro', dot: 'bg-red-400', text: 'text-red-300', border: 'border-red-500/30' },
  regional: { name: 'Regional', dot: 'bg-amber-400', text: 'text-amber-300', border: 'border-amber-500/30' },
  direct: { name: 'Direct', dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

const SEV_DOT: Record<Severity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-amber-300',
  low: 'bg-emerald-400',
};

function RiskRing({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? '#f87171' : score >= 50 ? '#fbbf24' : '#34d399';
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#262626" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
      </svg>
      <span className="text-[11px] font-bold text-white">{score}</span>
    </div>
  );
}

export default function ImpactContextCard({ attachment }: { attachment: ImpactAttachment }) {
  const [open, setOpen] = useState(false);
  const a = attachment.analysis;

  const params = new URLSearchParams({ query: attachment.profession });
  if (attachment.disruptionId) params.set('id', attachment.disruptionId);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-700/80 bg-neutral-950/80 text-left">
      <div className="flex items-start gap-3 p-3">
        <RiskRing score={a.riskScore} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <Network className="h-3 w-3" /> Impact analysis attached
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white">{a.headline}</p>
          <p className="truncate text-[11px] text-neutral-500">
            {attachment.profession}
            {attachment.disruptionTitle ? ` · ${attachment.disruptionTitle}` : ''}
          </p>
        </div>
      </div>

      {/* Level summary chips */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
        {LEVEL_ORDER.map((k, i) => {
          const s = LEVEL_STYLE[k];
          const lvl = a.levels[k];
          return (
            <div key={k} className={`min-w-0 rounded-lg border ${s.border} bg-neutral-900/80 px-2 py-1.5`}>
              <p className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${s.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> L{i + 1} · {s.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-neutral-300" title={lvl.nodes[0]?.title}>
                {lvl.nodes[0]?.title}
                {lvl.nodes.length > 1 && <span className="text-neutral-500"> +{lvl.nodes.length - 1}</span>}
              </p>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="space-y-3 border-t border-neutral-800 px-3 py-3">
          {LEVEL_ORDER.map((k) => (
            <div key={k}>
              <p className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${LEVEL_STYLE[k].text}`}>{a.levels[k].title}</p>
              <ul className="space-y-1">
                {a.levels[k].nodes.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-[11px] text-neutral-300">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEV_DOT[n.severity]}`} />
                    <span>
                      <span className="font-medium text-white">{n.title}</span>
                      <span className="text-neutral-500"> · {n.severity}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-neutral-800 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-white"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide cascade' : 'Show cascade'}
        </button>
        <Link
          href={`/impact-copilot?${params.toString()}`}
          className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
        >
          Open flowchart <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}