import React from 'react';
import { cn } from './cn';
import { SeverityKey, SEVERITY_ORDER } from '@/lib/disruptions';
import { SEVERITY_BG } from './Badge';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: 'accent' | 'critical' | 'high' | 'medium' | 'low';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, max = 100, variant = 'accent', size = 'sm', className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  const sizeStyles = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  const variantStyles = {
    accent: 'bg-accent',
    critical: 'bg-critical',
    high: 'bg-high',
    medium: 'bg-medium',
    low: 'bg-low',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('w-full overflow-hidden rounded-full bg-surface-3', sizeStyles[size], className)}
    >
      <div
        className={cn('h-full transition-all duration-500 ease-out', variantStyles[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Segmented Risk Telemetry Bar (Critical / High / Medium / Low distribution) */
export function RiskDistributionBar({
  counts,
  total,
  className,
}: {
  counts: Record<SeverityKey, number>;
  total: number;
  className?: string;
}) {
  if (!total) return null;

  return (
    <div className={cn('flex h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)} aria-hidden="true">
      {SEVERITY_ORDER.map((k) => {
        const count = counts[k] || 0;
        if (!count) return null;
        const pct = (count / total) * 100;
        return <div key={k} className={cn(SEVERITY_BG[k], 'transition-all duration-300')} style={{ width: `${pct}%` }} />;
      })}
    </div>
  );
}

