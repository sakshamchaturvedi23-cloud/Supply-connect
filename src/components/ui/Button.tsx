'use client';

import Link from 'next/link';
import React from 'react';
import { cn } from './cn';
import { Spinner } from './Feedback';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const baseStyles =
  'inline-flex items-center justify-center gap-2 font-medium tracking-tight whitespace-nowrap select-none transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1 focus-visible:ring-offset-black';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-white text-black font-semibold shadow-sm hover:bg-white/90 active:bg-white/80',
  secondary: 'bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/12 border border-white/10 text-white/90 hover:text-white transition-all shadow-sm',
  outline: 'border border-white/10 bg-transparent text-white/90 hover:bg-white/[0.05] hover:border-white/20 active:bg-white/10 transition-all',
  ghost: 'bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white active:bg-white/10 transition-all',
  danger: 'border border-white/15 bg-white/[0.05] text-white hover:bg-white/10 active:bg-white/15 transition-all',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-md',
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-4 text-sm rounded-lg',
  lg: 'h-10 px-5 text-sm rounded-lg',
  xl: 'h-11 px-6 text-base rounded-lg',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  pill = false,
  className?: string,
) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], pill && '!rounded-full', className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  pill = false,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, pill, className)}
      {...props}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  pill = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, pill, className)} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  'aria-label': string;
};

export function IconButton({
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  const iconSizeStyles: Record<ButtonSize, string> = {
    xs: 'h-7 w-7 text-xs rounded-md',
    sm: 'h-8 w-8 text-xs rounded-md',
    md: 'h-9 w-9 text-sm rounded-lg',
    lg: 'h-10 w-10 text-base rounded-lg',
    xl: 'h-11 w-11 text-lg rounded-lg',
  };

  return (
    <button
      type={type}
      className={cn(
        'inline-grid shrink-0 place-items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40',
        variantStyles[variant],
        iconSizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
