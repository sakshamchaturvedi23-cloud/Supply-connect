import React from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-surface', className)} {...props} />;
}

/** Section heading used inside pages: title + optional trailing action. */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-title-2 text-label">{title}</h2>
        {description && <p className="mt-1 text-caption text-label-2">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
