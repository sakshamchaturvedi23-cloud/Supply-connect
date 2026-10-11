'use client';

import React, { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { Disruption } from '@/lib/disruptions';
import { useDailyBrief } from '@/lib/useDailyBrief';
import { decodeEntities, truncate } from '@/lib/text';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { SeverityDot } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Feedback';
import { severityOf } from '@/lib/disruptions';
import { cn } from '@/components/ui/cn';

const noopSubscribe = () => () => {};
const longDate = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export function DailyBrief({ data, ready }: { data: Disruption[]; ready: boolean }) {
  const router = useRouter();
  const today = useSyncExternalStore(noopSubscribe, longDate, () => '');
  const { brief, status, sources, signalCount, regenerate, regenerating, retry } = useDailyBrief(data, ready);

  if (status === 'idle') return null;

  const rows = brief
    ? [
        { label: 'What changed', text: brief.changed },
        { label: 'Who’s affected', text: brief.affected },
        { label: 'What to do', text: brief.action, accent: true },
      ]
    : [];

  const chatQuery = brief
    ? `Today's supply chain brief:\n- What changed: ${brief.changed}\n- Who's affected: ${brief.affected}\n- What to do: ${brief.action}\n\nHow does this apply to my business, and what should I do first?`
    : '';

  return (
    <Card className="mt-4 p-6" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-headline">
            <Sparkles className="h-4 w-4 text-accent" /> Today’s brief
          </h2>
          <p className="mt-0.5 text-[13px] text-label-3">
            {today}
            {signalCount > 0 && `, from ${signalCount} ${signalCount === 1 ? 'signal' : 'signals'}`}
          </p>
        </div>
        {status === 'ready' && (
          <IconButton aria-label="Write a new brief" title="Write a new brief" onClick={regenerate} disabled={regenerating}>
            <RotateCcw className={cn('h-4 w-4', regenerating && 'animate-spin')} />
          </IconButton>
        )}
      </div>

      {status === 'loading' && (
        <div className="mt-5">
          <p className="text-[13px] text-label-2">Reading today’s signals and writing your brief…</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24 bg-surface-2" />
                <Skeleton className="h-4 bg-surface-2" />
                <Skeleton className="h-4 w-4/5 bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-label-2">Couldn’t write today’s brief. The AI service didn’t answer.</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {status === 'ready' && brief && (
        <>
          <dl className={cn('mt-5 grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line', regenerating && 'opacity-50 transition-opacity')}>
            {rows.map((r, i) => (
              <div key={r.label} className={cn(i > 0 && 'sm:pl-6', i < rows.length - 1 && 'sm:pr-6')}>
                <dt className={cn('text-[13px] font-medium', r.accent ? 'text-accent' : 'text-label-3')}>{r.label}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-label">{r.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 lg:flex-row lg:items-center lg:justify-between">
            {sources.length > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-[13px] text-label-3">Based on</span>
                {sources.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => router.replace(`/explore?highlight=${s.id}`, { scroll: false })}
                    title={decodeEntities(s.title)}
                    className="flex max-w-[16rem] items-center gap-1.5 rounded-full px-3 py-1 text-[13px] text-label-2 ring-1 ring-line transition-colors hover:bg-surface-2 hover:text-label"
                  >
                    <SeverityDot severity={severityOf(s.severity)} />
                    <span className="truncate">{truncate(decodeEntities(s.title), 48)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            <ButtonLink href={`/chat?query=${encodeURIComponent(chatQuery)}`} size="sm" variant="secondary" className="shrink-0">
              Discuss with Supply AI
            </ButtonLink>
          </div>
        </>
      )}
    </Card>
  );
}
