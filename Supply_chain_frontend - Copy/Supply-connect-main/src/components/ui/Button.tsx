import Link from 'next/link';
import React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-label hover:bg-surface-3',
  ghost: 'text-label-2 hover:bg-surface-2 hover:text-label',
  danger: 'text-critical hover:bg-critical/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** Square icon-only button. Always pass an aria-label. */
export function IconButton({
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-grid h-9 w-9 shrink-0 place-items-center rounded-full text-label-2 transition-colors hover:bg-surface-2 hover:text-label disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
