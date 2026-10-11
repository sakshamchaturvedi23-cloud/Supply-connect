import React from 'react';
import { AlertOctagon, AlertTriangle, Layers, Shield } from 'lucide-react';
import { SEVERITY_LABEL, SeverityKey, severityOf } from '@/lib/disruptions';
import { cn } from './cn';

export const SEVERITY_TEXT: Record<SeverityKey, string> = {
  critical: 'text-white',
  high: 'text-white/90',
  medium: 'text-white/75',
  low: 'text-white/55',
};

export const SEVERITY_BG: Record<SeverityKey, string> = {
  critical: 'bg-white',
  high: 'bg-white/80',
  medium: 'bg-white/50',
  low: 'bg-white/25',
};

export const SEVERITY_SUBTLE_BG: Record<SeverityKey, string> = {
  critical: 'bg-white/15 text-white border-white/40 shadow-sm',
  high: 'bg-white/10 text-white/90 border-white/25',
  medium: 'bg-white/[0.05] text-white/75 border-white/15',
  low: 'bg-white/[0.02] text-white/50 border-white/10',
};

export const SEVERITY_ICON: Record<SeverityKey, React.ComponentType<{ className?: string }>> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: Layers,
  low: Shield,
};

export function SeverityDot({
  severity,
  className,
  pulsing = false,
}: {
  severity: SeverityKey;
  className?: string;
  pulsing?: boolean;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {pulsing && (
        <span
          className={cn(
            'absolute inline-flex h-2.5 w-2.5 rounded-full opacity-40 animate-ping',
            severity === 'critical' ? 'bg-white' : 'bg-white/60'
          )}
        />
      )}
      <span
        aria-hidden
        className={cn(
          'relative inline-block h-2 w-2 shrink-0 rounded-full',
          severity === 'critical' && 'bg-white',
          severity === 'high' && 'border border-white bg-white/40',
          severity === 'medium' && 'bg-white/60',
          severity === 'low' && 'bg-white/25',
          className
        )}
      />
    </span>
  );
}

/** Severity badge — monochrome with explicit icon + label, never colour alone. */
export function SeverityBadge({
  value,
  variant = 'subtle',
  className,
}: {
  value?: string | null;
  variant?: 'subtle' | 'plain' | 'solid';
  className?: string;
}) {
  const s = severityOf(value);
  const Icon = SEVERITY_ICON[s];

  if (variant === 'plain') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium tracking-wide', SEVERITY_TEXT[s], className)}>
        <Icon className="h-3 w-3 shrink-0" />
        {SEVERITY_LABEL[s]}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border font-mono tracking-tight',
        SEVERITY_SUBTLE_BG[s],
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{SEVERITY_LABEL[s]}</span>
    </span>
  );
}

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'accent' | 'critical' | 'high' | 'medium' | 'low';

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-white/[0.06] text-white/80 border-white/10',
    secondary: 'bg-white/[0.04] text-white/70 border-white/10',
    outline: 'bg-transparent text-white/80 border-white/15',
    accent: 'bg-white/15 text-white border-white/30',
    critical: 'bg-white/15 text-white border-white/40',
    high: 'bg-white/10 text-white/90 border-white/25',
    medium: 'bg-white/[0.05] text-white/75 border-white/15',
    low: 'bg-white/[0.02] text-white/50 border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/80',
        className,
      )}
    >
      {children}
    </span>
  );
}
