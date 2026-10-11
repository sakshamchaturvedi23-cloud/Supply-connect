import React from 'react';
import { AlertTriangle, Flame, Layers, Globe2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export interface RiskSummaryProps {
  criticalCount: number;
  highCount: number;
  totalTracked: number;
  topSectorName?: string;
  loading?: boolean;
}

export function RiskSummary({
  criticalCount,
  highCount,
  totalTracked,
  topSectorName = 'Logistics & Freight',
  loading,
}: RiskSummaryProps) {
  const stats = [
    {
      label: 'Critical Signals',
      value: loading ? '—' : criticalCount,
      icon: Flame,
      color: 'text-critical',
      bg: 'bg-critical-subtle border-critical-border',
      subtext: 'Immediate disruption risk',
    },
    {
      label: 'High Risk Signals',
      value: loading ? '—' : highCount,
      icon: AlertTriangle,
      color: 'text-high',
      bg: 'bg-high-subtle border-high-border',
      subtext: 'Lead time volatility',
    },
    {
      label: 'Signals Tracked',
      value: loading ? '—' : totalTracked,
      icon: Layers,
      color: 'text-accent',
      bg: 'bg-accent-subtle border-accent-border',
      subtext: 'Live global news ingest',
    },
    {
      label: 'Most Exposed Sector',
      value: loading ? '—' : topSectorName,
      icon: Globe2,
      color: 'text-label',
      bg: 'bg-surface-elevated border-line',
      subtext: 'Highest risk concentration',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-label-3">{s.label}</span>
            <span className={`grid h-6 w-6 place-items-center rounded-md border ${s.bg}`}>
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </span>
          </div>
          <div className="mt-3">
            <p className={`font-semibold tracking-tight ${s.isText ? 'text-base truncate' : 'text-2xl font-mono tabular-nums'} ${s.color}`}>
              {s.value}
            </p>
            <p className="mt-1 text-[11px] text-label-3 truncate">{s.subtext}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

