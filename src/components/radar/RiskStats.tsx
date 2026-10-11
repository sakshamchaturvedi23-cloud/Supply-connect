import React from 'react';
import { RiskDistributionBar } from '@/components/ui/Progress';
import { SeverityKey, SEVERITY_ORDER, SEVERITY_LABEL } from '@/lib/disruptions';
import { decodeEntities } from '@/lib/text';

export interface RiskStatsProps {
  status: 'loading' | 'ready' | 'error';
  total: number;
  urgent: number;
  counts: Record<SeverityKey, number>;
  topSector?: string;
  topTitle?: string;
}

export function RiskStats({
  status,
  total,
  urgent,
  counts,
  topSector = 'Logistics & Freight',
  topTitle,
}: RiskStatsProps) {
  return (
    <div className="grid rounded-2xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="p-6">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Signals Tracked</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
          {status === 'loading' ? '—' : total}
        </p>
        <div className="mt-3">
          <RiskDistributionBar counts={counts} total={total} />
        </div>
        <p className="mt-2 text-xs font-mono text-slate-400">
          {SEVERITY_ORDER.map((k) => `${counts[k] || 0} ${SEVERITY_LABEL[k].toLowerCase()}`).join(' · ')}
        </p>
      </div>

      <div className="p-6">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Need Immediate Attention</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
          {status === 'loading' ? '—' : urgent}
        </p>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Critical and high severity bottlenecks requiring active supply buffering.
        </p>
      </div>

      <div className="min-w-0 p-6">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-medium font-mono">Most Exposed Sector</p>
        <p className="mt-2 truncate text-xl font-semibold text-white">
          {topSector}
        </p>
        <p className="mt-3 line-clamp-2 text-xs text-slate-400 leading-relaxed">
          {topTitle ? decodeEntities(topTitle) : 'Continuous telemetry ingestion active.'}
        </p>
      </div>
    </div>
  );
}

