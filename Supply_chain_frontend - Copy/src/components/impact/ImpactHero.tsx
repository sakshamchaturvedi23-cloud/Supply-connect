'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/Feedback';

export const IMPACT_EXAMPLES = [
  'Hardware manufacturing',
  'EV battery startup',
  'Pharma distribution',
  'D2C apparel brand',
];

export const IMPACT_OUTPUTS = [
  {
    title: 'Causal Exposure Score',
    text: 'A 0–100 composite risk score projected onto your specific supply and product architecture.',
  },
  {
    title: 'Macro → Direct Flowchart',
    text: 'Visual causal propagation tracing how global shocks cascade into regional hubs and direct lead times.',
  },
  {
    title: 'Mitigation Playbook',
    text: 'Phased operational response playbook (Immediate, Short-term, Strategic) with owners and priorities.',
  },
];

export function ImpactHero({
  profession,
  onProfessionChange,
  onSubmit,
  disabled,
  error,
}: {
  profession: string;
  onProfessionChange: (val: string) => void;
  onSubmit: (val: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <Card className="p-6 sm:p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(profession);
        }}
      >
        <label htmlFor="profession" className="text-title-2 font-semibold text-label tracking-tight">
          What does your business or project produce?
        </label>
        <p className="mt-1.5 text-body text-label-2 leading-relaxed">
          Describe your product, suppliers, or assembly pipeline in a short sentence.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            id="profession"
            value={profession}
            onChange={(e) => onProfessionChange(e.target.value)}
            placeholder="e.g. We assemble e-bikes in Pune with motor components sourced from Shenzhen"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface-elevated px-4 text-sm text-label outline-none placeholder:text-label-3 focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <Button type="submit" size="md" disabled={!profession.trim() || disabled}>
            Generate causal analysis
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-label-3 mr-1">Examples:</span>
          {IMPACT_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onProfessionChange(ex)}
              className="rounded-md border border-line bg-surface-elevated px-2.5 py-1 text-xs text-label-2 transition-colors hover:border-line-strong hover:bg-surface-hover hover:text-label"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && <InlineError className="mt-5">{error}</InlineError>}

      <div className="mt-8 border-t border-line pt-6">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-label-3">
          Analysis Deliverables
        </p>
        <dl className="mt-3 grid gap-5 sm:grid-cols-3">
          {IMPACT_OUTPUTS.map((o) => (
            <div key={o.title} className="rounded-lg border border-line/60 bg-surface-elevated p-3.5">
              <dt className="text-xs font-semibold text-label">{o.title}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-label-2">{o.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

