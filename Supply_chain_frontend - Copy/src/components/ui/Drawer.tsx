'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './Button';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  side?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = 'right',
  size = 'md',
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
  };

  const sideStyles = {
    right: 'inset-y-0 right-0 border-l border-line-strong',
    left: 'inset-y-0 left-0 border-r border-line-strong',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'fixed flex flex-col bg-surface shadow-2xl transition-transform duration-300 ease-in-out w-full',
          sideStyles[side],
          sizeStyles[size],
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-title-2 font-semibold text-label tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-label-3 mt-0.5">{description}</p>}
          </div>
          <IconButton aria-label="Close drawer" onClick={onClose} size="sm">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

