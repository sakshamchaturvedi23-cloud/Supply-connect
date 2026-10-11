import React from 'react';
import { cn } from './cn';

export { Skeleton } from './Skeleton';
export { EmptyState } from './EmptyState';

export function InlineError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn('rounded-lg border border-critical-border bg-critical-subtle px-3.5 py-2.5 text-xs text-critical font-medium', className)}>
      {children}
    </p>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}
