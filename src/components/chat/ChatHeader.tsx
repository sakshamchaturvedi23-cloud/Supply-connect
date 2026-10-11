'use client';

import React from 'react';
import { Plus, History } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

export function ChatHeader({
  title,
  subtitle,
  onNewChat,
  onOpenHistory,
}: {
  title: string;
  subtitle?: string;
  onNewChat: () => void;
  onOpenHistory: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/20 backdrop-blur-md px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-sm font-medium tracking-tight text-white">{title}</h1>
        <p className="truncate text-xs text-white/50">{subtitle || 'Markets, logistics, and supplier diversification'}</p>
      </div>
      <div className="flex items-center gap-1 lg:hidden">
        <IconButton aria-label="New conversation" onClick={onNewChat} size="sm" className="text-white/70 hover:text-white">
          <Plus className="h-4 w-4" />
        </IconButton>
        <IconButton aria-label="Show conversation history" onClick={onOpenHistory} size="sm" className="text-white/70 hover:text-white">
          <History className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}

