import React from 'react';
import { SEVERITY_LABEL, SeverityKey, severityOf } from '@/lib/disruptions';
import { cn } from './cn';

export const SEVERITY_TEXT: Record<SeverityKey, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
};

export const SEVERITY_BG: Record<SeverityKey, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
};

export const SEVERITY_HEX: Record<SeverityKey, string> = {
  critical: '#ff453a',
  high: '#ff9f0a',
  medium: '#ffd60a',
  low: '#30d158',
};

export function SeverityDot({ severity, className }: { severity: SeverityKey; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2 w-2 shrink-0 rounded-full', SEVERITY_BG[severity], className)} />;
}

/** "● High" — severity always carries a label, never colour alone. */
export function SeverityBadge({ value, className }: { value?: string | null; className?: string }) {
  const s = severityOf(value);
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium', SEVERITY_TEXT[s], className)}>
      <SeverityDot severity={s} />
      {SEVERITY_LABEL[s]}
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-label-2', className)}>
      {children}
    </span>
  );
}
