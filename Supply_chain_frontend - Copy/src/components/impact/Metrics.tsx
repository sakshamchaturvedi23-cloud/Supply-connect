import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { ImpactMetric } from '@/lib/impact-schema';

export function Metrics({ metrics }: { metrics: ImpactMetric[] }) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m, i) => {
        const TrendIcon = m.trend === 'up' ? TrendingUp : m.trend === 'down' ? TrendingDown : Minus;
        const tone = m.trend === 'up' ? 'text-critical' : m.trend === 'down' ? 'text-low' : 'text-label-3';

        return (
          <div key={i} className="rounded-lg border border-line bg-surface-elevated p-3">
            <dt className="text-xs text-label-3 truncate">{m.label}</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-base font-mono font-semibold tabular-nums text-label">
              <span>{m.value}</span>
              <TrendIcon className={`h-3.5 w-3.5 ${tone}`} aria-label={`trend ${m.trend}`} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

