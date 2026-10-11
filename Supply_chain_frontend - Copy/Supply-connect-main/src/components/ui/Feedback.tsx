import React from 'react';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-surface', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-card bg-surface px-6 py-14 text-center', className)}>
      {icon && <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-label-2">{icon}</div>}
      <p className="text-headline text-label">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-caption text-label-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function InlineError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn('rounded-xl bg-critical/10 px-4 py-3 text-caption text-critical', className)}>
      {children}
    </p>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}
