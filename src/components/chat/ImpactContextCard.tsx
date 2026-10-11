// Visual "attachment" card shown inside the user's message instead of a raw JSON dump.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Network } from 'lucide-react';
import { LEVEL_ORDER, LevelKey, Severity } from '@/lib/impact-schema';
import { ImpactAttachment } from '@/lib/share-context';

const LEVEL_STYLE: Record<LevelKey, { name: string; dot: string; text: string; border: string }> = {
  macro: { name: 'Macro', dot: 'bg-white', text: 'text-white', border: 'border-white/20' },
  regional: { name: 'Regional', dot: 'bg-white/80', text: 'text-white/80', border: 'border-white/15' },
  direct: { name: 'Direct', dot: 'bg-white/60', text: 'text-white/90', border: 'border-white/15' },
};

const SEV_DOT: Record<Severity, string> = {
  critical: 'bg-white',
  high: 'bg-white/80',
  medium: 'bg-white/50',
  low: 'bg-white/25',
};

function RiskRing({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? '#FFFFFF' : score >= 50 ? '#E4E4E7' : '#A1A1AA';
  return (
    <div className="relative grid h-11 w-11 shrink-0 place-items-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="4" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
      </svg>
      <span className="text-[11px] font-medium text-white">{score}</span>
    </div>
  );
}

export default function ImpactContextCard({ attachment }: { attachment: ImpactAttachment }) {
  const [open, setOpen] = useState(false);
  const a = attachment.analysis;

  const params = new URLSearchParams({ query: attachment.profession });
  if (attachment.disruptionId) params.set('id', attachment.disruptionId);

  return (
    <div className="w-full overflow-hidden rounded-2xl liquid-glass text-left">
      <div className="flex items-start gap-3 p-3">
        <RiskRing score={a.riskScore} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-white/90">
            <Network className="h-3 w-3 text-white/70" /> Impact analysis attached
          </p>
          <p className="mt-0.5 truncate text-[13px] font-medium text-white">{a.headline}</p>
          <p className="truncate text-[11px] text-white/50">
            {attachment.profession}
            {attachment.disruptionTitle ? `, ${attachment.disruptionTitle}` : ''}
          </p>
        </div>
      </div>

      {/* Level summary chips */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
        {LEVEL_ORDER.map((k, i) => {
          const s = LEVEL_STYLE[k];
          const lvl = a.levels[k];
          return (
            <div key={k} className={`min-w-0 rounded-lg border ${s.border} bg-white/[0.04] px-2 py-1.5`}>
              <p className={`flex items-center gap-1 text-[11px] font-medium ${s.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> L{i + 1} {s.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/70" title={lvl.nodes[0]?.title}>
                {lvl.nodes[0]?.title}
                {lvl.nodes.length > 1 && <span className="text-white/40"> +{lvl.nodes.length - 1}</span>}
              </p>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/10 px-3 py-3">
          {LEVEL_ORDER.map((k) => (
            <div key={k}>
              <p className={`mb-1 text-[12px] font-medium ${LEVEL_STYLE[k].text}`}>{a.levels[k].title}</p>
              <ul className="space-y-1">
                {a.levels[k].nodes.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-[11px] text-white/70">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEV_DOT[n.severity]}`} />
                    <span>
                      <span className="font-medium text-white">{n.title}</span>
                      <span className="text-white/40">, {n.severity}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-white/60 hover:text-white"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide cascade' : 'Show cascade'}
        </button>
        <Link
          href={`/impact-copilot?${params.toString()}`}
          className="flex items-center gap-1 text-[11px] font-medium text-white/90 hover:text-white"
        >
          Open flowchart <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}