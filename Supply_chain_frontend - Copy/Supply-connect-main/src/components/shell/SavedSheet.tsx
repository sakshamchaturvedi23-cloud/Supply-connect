'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, MessageSquare, Trash2, X } from 'lucide-react';
import { useAdvisorChats, useSavedSignals } from '@/lib/saved';
import { categoryMeta, categorize } from '@/lib/disruptions';
import { decodeEntities, relativeTime } from '@/lib/text';
import { SeverityBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/Feedback';

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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Saved items"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-2xl outline-none sm:inset-y-3 sm:right-3 sm:rounded-card"
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-title-2">Saved</h2>
          <IconButton aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="px-5 pb-4">
          <SegmentedControl<Tab>
            label="Saved item type"
            trackClassName="bg-canvas"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'signals', label: 'Signals', count: signals.length },
              { value: 'chats', label: 'Conversations', count: chats.length },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-5">
          {tab === 'signals' ? (
            signals.length === 0 ? (
              <EmptyState
                className="bg-transparent"
                icon={<Bookmark className="h-5 w-5" />}
                title="No saved signals"
                description="Tap the bookmark on any signal in the Disruption Radar to keep it here."
              />
            ) : (
              <ul className="space-y-1">
                {signals.map((s) => (
                  <li key={s.id} className="group flex items-start gap-2 rounded-2xl px-2 py-1 hover:bg-surface-2">
                    <button onClick={() => go(`/explore?highlight=${s.id}`)} className="min-w-0 flex-1 py-2 pl-1 text-left">
                      <span className="flex items-center gap-2 text-[12px] text-label-3">
                        <SeverityBadge value={s.severity} />
                        <span>{categoryMeta(categorize(s)).short}</span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm font-medium text-label">{decodeEntities(s.title)}</span>
                    </button>
                    <IconButton aria-label="Remove saved signal" onClick={() => removeSignal(s.id)} className="mt-1 opacity-60 hover:text-critical group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )
          ) : chats.length === 0 ? (
            <EmptyState
              className="bg-transparent"
              icon={<MessageSquare className="h-5 w-5" />}
              title="No saved conversations"
              description="Use “Save conversation” in the Strategy Advisor to keep a plan here."
            />
          ) : (
            <ul className="space-y-1">
              {chats.map((c) => (
                <li key={c.sessionId} className="group flex items-center gap-2 rounded-2xl px-2 py-1 hover:bg-surface-2">
                  <button onClick={() => go(`/startup-advisor?sessionId=${encodeURIComponent(c.sessionId)}`)} className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-1 text-left">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-3 text-label-2">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-label">{decodeEntities(c.title)}</span>
                      <span className="block text-[12px] text-label-3">
                        {c.messages.length} messages, {relativeTime(c.timestamp)}
                      </span>
                    </span>
                  </button>
                  <IconButton aria-label="Delete conversation" onClick={() => removeChat(c.sessionId)} className="opacity-60 hover:text-critical group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
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
