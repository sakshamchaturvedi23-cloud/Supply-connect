import React from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-line bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3.5 grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-elevated text-label-2 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-label tracking-tight">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-label-3 leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

