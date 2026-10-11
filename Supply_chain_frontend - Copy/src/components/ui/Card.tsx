import React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'outline';
}

export function Card({ variant = 'default', className, ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl rounded-2xl text-white',
    elevated: 'bg-[#0e121d]/60 backdrop-blur-lg border border-white/[0.09] shadow-2xl rounded-2xl text-white',
    interactive:
      'bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl rounded-2xl text-white hover:bg-white/[0.06] hover:border-white/15 transition-all cursor-pointer',
    outline: 'rounded-2xl border border-white/[0.07] bg-transparent text-white',
  };

  return (
    <div
      className={cn('text-white transition-all', variantStyles[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-headline font-medium text-white leading-none tracking-tight', className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-caption text-white/60 leading-relaxed', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0 border-t border-white/[0.08] mt-4', className)} {...props} />;
}

/** Section heading used inside pages: title + optional description + optional trailing action. */
export function SectionHeading({
  title,
  description,
  badge,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-title-2 font-medium text-white tracking-tight">{title}</h2>
          {badge}
        </div>
        {description && <p className="mt-1 text-caption text-white/60 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0 mt-2 sm:mt-0">{action}</div>}
    </div>
  );
}
