'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, MessageSquare, Trash2, X } from 'lucide-react';
import { useAdvisorChats, useSavedSignals } from '@/lib/saved';
import { categoryMeta, categorize } from '@/lib/disruptions';
import { decodeEntities, relativeTime } from '@/lib/text';
import { SeverityBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { cn } from '@/components/ui/cn';

type Tab = 'signals' | 'chats';

export function SavedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { signals, remove: removeSignal } = useSavedSignals();
  const { chats, remove: removeChat } = useAdvisorChats();
  const [tab, setTab] = useState<Tab>('signals');
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

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Saved items"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#0a0d14]/90 backdrop-blur-2xl border border-white/[0.09] shadow-2xl outline-none sm:inset-y-3 sm:right-3 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-6 pb-4 pt-6 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-medium text-white tracking-tight">Saved Archive</h2>
            <p className="text-xs text-slate-400 mt-0.5">Monitored signals and strategic sessions</p>
          </div>
          <IconButton
            aria-label="Close"
            onClick={onClose}
            className="text-white/60 hover:text-white rounded-full bg-white/5 border border-white/10"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Tab switcher */}
        <div className="px-6 py-4">
          <div className="flex items-center rounded-full bg-white/[0.03] backdrop-blur-md border border-white/[0.07] p-1">
            <button
              type="button"
              onClick={() => setTab('signals')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-full transition-all text-center',
                tab === 'signals'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Signals ({signals.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('chats')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-full transition-all text-center',
                tab === 'chats'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Conversations ({chats.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {tab === 'signals' ? (
            signals.length === 0 ? (
              <EmptyState
                className="bg-transparent text-white/70"
                icon={<Bookmark className="h-5 w-5 text-white/40" />}
                title="No saved signals"
                description="Tap the bookmark on any signal to retain it in your private archive."
              />
            ) : (
              <ul className="space-y-2">
                {signals.map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-start gap-2 rounded-2xl liquid-glass p-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <button
                      onClick={() => go(`/explore?highlight=${s.id}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 text-[11px] text-white/60">
                        <SeverityBadge value={s.severity} />
                        <span className="truncate">{categoryMeta(categorize(s)).short}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs font-medium text-white leading-snug">
                        {decodeEntities(s.title)}
                      </p>
                    </button>
                    <IconButton
                      aria-label="Remove saved signal"
                      onClick={() => removeSignal(s.id)}
                      className="text-white/40 hover:text-white opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )
          ) : chats.length === 0 ? (
            <EmptyState
              className="bg-transparent text-white/70"
              icon={<MessageSquare className="h-5 w-5 text-white/40" />}
              title="No saved conversations"
              description="Save response playbooks in Strategy Advisor to revisit them here."
            />
          ) : (
            <ul className="space-y-2">
              {chats.map((c) => (
                <li
                  key={c.sessionId}
                  className="group flex items-center gap-2 rounded-2xl liquid-glass p-3 transition-colors hover:bg-white/[0.06]"
                >
                  <button
                    onClick={() => go(`/startup-advisor?sessionId=${encodeURIComponent(c.sessionId)}`)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 text-white border border-white/15">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{decodeEntities(c.title)}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        {c.messages.length} messages · {relativeTime(c.timestamp)}
                      </p>
                    </div>
                  </button>
                  <IconButton
                    aria-label="Delete conversation"
                    onClick={() => removeChat(c.sessionId)}
                    className="text-white/40 hover:text-white opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
