import React from 'react';
import { cn } from '@/components/ui/cn';

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line/60 pb-6', className)}>
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-title-1 font-semibold text-label tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="max-w-2xl text-body text-label-2 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide' | 'full';
}

export function PageContainer({ size = 'default', className, ...props }: PageContainerProps) {
  const sizeStyles = {
    narrow: 'max-w-4xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-none',
  };

  return (
    <div
      className={cn('mx-auto w-full px-4 pb-20 pt-6 sm:px-6 md:px-8 md:pt-8', sizeStyles[size], className)}
      {...props}
    />
  );
}

