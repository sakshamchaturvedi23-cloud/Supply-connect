'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export interface PromptItem {
  title: string;
  prompt: string;
}

export const DEFAULT_SUGGESTIONS: PromptItem[] = [
  { title: 'Lithium Market Outlook', prompt: 'What is the 6-month outlook for lithium cell pricing and raw material constraints?' },
  { title: 'Dual-Sourcing Strategy', prompt: 'How should a hardware manufacturing startup structure dual sourcing for microcontrollers?' },
  { title: 'Freight Volatility Buffers', prompt: 'How can our company protect procurement margins against ocean freight container spikes?' },
  { title: 'Tariff & Trade Exposure', prompt: 'Give me a structured framework to audit tariff exposure across our Asian suppliers.' },
];

export function SuggestedPrompts({
  prompts = DEFAULT_SUGGESTIONS,
  onSelect,
}: {
  prompts?: PromptItem[];
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center pt-[6vh] text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
        <Sparkles className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-title-1 font-semibold tracking-tight text-label">
        Supply Chain Intelligence
      </h2>
      <p className="mt-1.5 max-w-md text-xs text-label-2 leading-relaxed">
        Ask real-time questions about maritime freight lanes, raw material spot prices, or attach an Impact Copilot flowchart.
      </p>

      <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2 text-left">
        {prompts.map((s) => (
          <button
            key={s.title}
            onClick={() => onSelect(s.prompt)}
            className="rounded-lg border border-line bg-surface p-3.5 transition-colors hover:border-line-strong hover:bg-surface-elevated text-left"
          >
            <p className="text-xs font-semibold text-label">{s.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-label-3 leading-relaxed">{s.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

