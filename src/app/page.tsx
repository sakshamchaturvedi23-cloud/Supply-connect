'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { useDisruptions } from '@/lib/useDisruptions';
import { bySeverityThenDate, categorize, categoryMeta, severityOf } from '@/lib/disruptions';
import { decodeEntities } from '@/lib/text';
import { NAV_ITEMS } from '@/components/shell/nav';
import { PageContainer } from '@/components/ui/PageHeader';
import { Card, SectionHeading } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Feedback';

const EXAMPLE_QUESTIONS = [
  'What is the risk status of semiconductor imports?',
  'How will Red Sea shipping delays affect lead times?',
  'Which raw materials are getting more expensive?',
];

const TOOL_HREFS = ['/impact-copilot', '/chat', '/simulate'];

const noopSubscribe = () => () => {};
const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** Client-only date (avoids a server/client hydration mismatch). */
function useToday() {
  return useSyncExternalStore(noopSubscribe, todayLabel, () => '');
}

export default function OverviewPage() {
  const router = useRouter();
  const today = useToday();
  const { data, status } = useDisruptions();
  const [question, setQuestion] = useState('');

  const urgent = useMemo(() => data.filter((d) => ['critical', 'high'].includes(severityOf(d.severity))), [data]);
  const top = useMemo(() => [...data].sort(bySeverityThenDate).slice(0, 5), [data]);

  const headline =
    status !== 'ready'
      ? 'See disruptions before they reach you.'
      : urgent.length === 0
        ? 'No urgent disruptions right now.'
        : `${urgent.length} ${urgent.length === 1 ? 'disruption needs' : 'disruptions need'} your attention.`;

  const ask = (q: string) => {
    const text = q.trim();
    if (text) router.push(`/chat?query=${encodeURIComponent(text)}`);
  };

  return (
    <PageContainer className="max-w-5xl">
      {/* Hero */}
      <section className="pt-4 md:pt-10">
        <p className="h-5 text-caption text-label-2">{today}</p>
        <h1 className="mt-3 max-w-3xl text-display text-label">{headline}</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-label-2">
          Supply Connect watches ports, chips, prices and trade policy worldwide, and tells you what could reach your
          business and what to do about it.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="mt-10 flex max-w-2xl items-center gap-2 rounded-full bg-surface p-1.5 pl-5 transition-shadow focus-within:ring-2 focus-within:ring-accent/60"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask Supply AI about a market, supplier or route"
            aria-label="Ask Supply AI"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-label outline-none placeholder:text-label-3"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Ask"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:bg-surface-3 disabled:text-label-3"
          >
            <ArrowUp className="h-[18px] w-[18px]" />
          </button>
        </form>
        <div className="mt-3 flex max-w-2xl flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full px-3 py-1.5 text-[13px] text-label-2 ring-1 ring-line transition-colors hover:bg-surface hover:text-label"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* Highest risk */}
        <section className="min-w-0">
          <SectionHeading
            title="Highest risk right now"
            action={
              <Link href="/explore" className="text-sm text-accent hover:underline">
                Open radar
              </Link>
            }
          />
          <Card className="overflow-hidden">
            {status === 'loading' ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 bg-surface-2" />
                ))}
              </div>
            ) : status === 'error' ? (
              <p className="px-5 py-8 text-caption text-label-2">
                Couldn’t reach the signal database. Check your Supabase keys in .env.local, then reload.
              </p>
            ) : top.length === 0 ? (
              <p className="px-5 py-8 text-caption text-label-2">No signals yet. Open the radar and sync to pull the latest news.</p>
            ) : (
              <ul className="divide-y divide-line">
                {top.map((d) => (
                  <li key={d.id}>
                    <Link href={`/explore?highlight=${d.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-label">{decodeEntities(d.title)}</p>
                        <p className="mt-0.5 flex items-center gap-3 text-[13px] text-label-3">
                          <SeverityBadge value={d.severity} />
                          <span className="truncate">{d.location ? decodeEntities(d.location) : categoryMeta(categorize(d)).short}</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-label-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Tools */}
        <section className="min-w-0">
          <SectionHeading title="Plan a response" />
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {NAV_ITEMS.filter((n) => TOOL_HREFS.includes(n.href)).map(({ href, label, description, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-label">{label}</span>
                      <span className="block truncate text-[13px] text-label-3">{description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-label-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
