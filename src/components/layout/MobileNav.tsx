'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { IconButton } from '@/components/ui/Button';

export function MobileNav({
  open,
  onClose,
  savedCount,
  onOpenSaved,
}: {
  open: boolean;
  onClose: () => void;
  savedCount: number;
  onOpenSaved: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        tabIndex={-1}
        className="fixed inset-y-0 left-0 flex w-72 flex-col bg-canvas border-r border-line-strong shadow-2xl transition-transform"
      >
        <div className="absolute right-3 top-3 z-10">
          <IconButton aria-label="Close menu" onClick={onClose} size="sm">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <Sidebar
          savedCount={savedCount}
          onOpenSaved={() => {
            onClose();
            onOpenSaved();
          }}
          onNavigate={onClose}
        />
      </div>
    </div>
  );
}

