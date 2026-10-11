'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Check } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';

export interface AdvisorHeaderProps {
  title: string;
  subtitle?: string;
  canSave: boolean;
  savedFlash: boolean;
  alreadySaved: boolean;
  streaming: boolean;
  onSave: () => void;
}

export function AdvisorHeader({
  title,
  subtitle,
  canSave,
  savedFlash,
  alreadySaved,
  streaming,
  onSave,
}: AdvisorHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-black/20 backdrop-blur-md px-4 sm:px-6">
      <Link
        href="/explore"
        aria-label="Back to Disruption Radar"
        className="inline-grid h-8 w-8 place-items-center rounded-lg liquid-glass text-white/70 hover:bg-white/15 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-medium tracking-tight text-white truncate">{title}</h1>
        {subtitle && <p className="truncate text-xs text-white/50">{subtitle}</p>}
      </div>

      <Button
        variant={savedFlash ? 'primary' : 'secondary'}
        size="sm"
        onClick={onSave}
        disabled={!canSave || streaming}
        className="hidden sm:inline-flex"
        leftIcon={savedFlash ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      >
        {savedFlash ? 'Saved' : alreadySaved ? 'Update saved' : 'Save conversation'}
      </Button>

      <IconButton
        aria-label="Save conversation"
        onClick={onSave}
        disabled={!canSave || streaming}
        size="sm"
        className="sm:hidden text-white/70 hover:text-white"
      >
        {savedFlash ? <Check className="h-4 w-4 text-white" /> : <Bookmark className="h-4 w-4" />}
      </IconButton>
    </header>
  );
}

