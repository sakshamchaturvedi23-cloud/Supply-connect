'use client';

import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from './cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, leftIcon, rightIcon, type = 'text', ...props },
  ref,
) {
  return (
    <div className="relative flex items-center w-full">
      {leftIcon && <span className="absolute left-3 flex items-center text-white/50 pointer-events-none">{leftIcon}</span>}
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white shadow-sm transition-colors backdrop-blur-md',
          'placeholder:text-white/40',
          'hover:border-white/20',
          'focus-visible:outline-none focus-visible:border-white/40 focus-visible:ring-1 focus-visible:ring-white/40',
          'disabled:cursor-not-allowed disabled:opacity-40',
          leftIcon ? 'pl-9' : undefined,
          rightIcon ? 'pr-9' : undefined,
          error ? 'border-white/40 ring-1 ring-white/40' : undefined,
          className,
        )}
        {...props}
      />
      {rightIcon && <span className="absolute right-3 flex items-center text-white/50">{rightIcon}</span>}
    </div>
  );
});

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, onClear, placeholder = 'Search risk signals...', shortcut, className, ...props },
  ref,
) {
  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Search className="absolute left-3.5 h-4 w-4 text-white/40 pointer-events-none" aria-hidden />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-14 text-sm text-white shadow-sm transition-colors backdrop-blur-md',
          'placeholder:text-white/40 hover:border-white/20',
          'focus-visible:outline-none focus-visible:border-white/40 focus-visible:ring-1 focus-visible:ring-white/40',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
        {...props}
      />
      <div className="absolute right-2.5 flex items-center gap-1.5">
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            aria-label="Clear search"
            className="grid h-5 w-5 place-items-center rounded-md bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        ) : shortcut ? (
          <kbd className="hidden sm:inline-flex items-center rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/40 bg-white/[0.04]">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white shadow-sm transition-colors backdrop-blur-md',
        'placeholder:text-white/40 hover:border-white/20',
        'focus-visible:outline-none focus-visible:border-white/40 focus-visible:ring-1 focus-visible:ring-white/40',
        'disabled:cursor-not-allowed disabled:opacity-40',
        error && 'border-white/40 ring-1 ring-white/40',
        className,
      )}
      {...props}
    />
  );
});

export function FormField({
  label,
  description,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white tracking-tight">
        {label}
        {required && <span className="ml-1 text-white/50">*</span>}
      </label>
      {description && <p className="text-xs text-white/60">{description}</p>}
      {children}
      {error && <p className="text-xs text-white/80 font-mono mt-1">{error}</p>}
    </div>
  );
}
