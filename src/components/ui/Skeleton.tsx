import React from 'react';
import { cn } from './cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export function Skeleton({ variant = 'rectangular', className, ...props }: SkeletonProps) {
  const variantStyles = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-3.5 w-full',
  };

  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-surface-3/60', variantStyles[variant], className)}
      {...props}
    />
  );
}

