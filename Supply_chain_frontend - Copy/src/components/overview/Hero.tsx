'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, Sparkles } from 'lucide-react';

export const EXAMPLE_QUESTIONS = [
  'What is the risk status of semiconductor imports?',
  'How will Red Sea shipping delays affect lead times?',
  'Which raw materials are getting more expensive?',
];

export function Hero({
  dateLabel,
  urgentCount,
  status,
}: {
  dateLabel: string;
  urgentCount: number;
  status: 'loading' | 'ready' | 'error';
}) {
  const router = useRouter();
  const [question, setQuestion] = useState('');

  const headline =
    status !== 'ready'
      ? 'See disruptions before they reach you.'
      : urgentCount === 0
        ? 'No critical disruptions detected right now.'
        : `${urgentCount} supply chain ${urgentCount === 1 ? 'disruption requires' : 'disruptions require'} your attention.`;

  const ask = (q: string) => {
    const text = q.trim();
    if (text) router.push(`/chat?query=${encodeURIComponent(text)}`);
  };

  return (
    <section className="pt-2 md:pt-6">
      {/* Date & Terminal Status */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface-elevated px-2.5 py-0.5 text-xs font-mono font-medium text-label-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {dateLabel || 'Global Telemetry Active'}
        </span>
      </div>

      <h1 className="mt-4 max-w-3xl text-display text-label tracking-tight font-semibold">
        {headline}
      </h1>

      <p className="mt-3 max-w-2xl text-body text-label-2 leading-relaxed">
        Supply Connect monitors maritime choke points, semiconductor fabrication, raw material inflation, and trade regulations worldwide — projecting downstream operational impact onto your business with AI.
      </p>

      {/* AI Intelligence Query Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-8 flex max-w-2xl items-center gap-2 rounded-xl border border-line bg-surface p-1.5 pl-4 shadow-sm transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
      >
        <Sparkles className="h-4 w-4 text-accent shrink-0" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Supply AI about a port, component shortage, or supplier route..."
          aria-label="Ask Supply AI"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-label outline-none placeholder:text-label-3"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          aria-label="Ask Supply AI"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-white transition-all hover:bg-accent-hover disabled:bg-surface-3 disabled:text-label-3"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>

      {/* Starters */}
      <div className="mt-3 flex max-w-2xl flex-wrap items-center gap-2">
        <span className="text-xs text-label-3 mr-1">Suggested:</span>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            type="button"
            className="rounded-md border border-line bg-surface-elevated px-2.5 py-1 text-xs text-label-2 transition-colors hover:border-line-strong hover:bg-surface-hover hover:text-label"
          >
            {q}
          </button>
        ))}
      </div>
    </section>
  );
}

