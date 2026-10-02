'use client';

import React, { useState } from 'react';
import { ArrowRight, Gauge, ListChecks, Network } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CascadeFlowchart } from './CascadeFlowchart';
import { RiskGauge } from './RiskGauge';
import { SAMPLE_ANALYSIS, SAMPLE_PROFILE_PHRASE } from './sampleAnalysis';

const PARTS = [
  { icon: Gauge, title: 'Risk score', text: 'A 0–100 score for your business, and the numbers that drive it.' },
  { icon: Network, title: 'Impact chain', text: 'Global shock to regional ripple to your operations, linked step by step.' },
  { icon: ListChecks, title: 'Playbook', text: 'What to do this week, this month and this quarter, with owners.' },
];

/** Live, interactive example shown before the user runs an analysis. */
export function CopilotPreview({ onOpenExample }: { onOpenExample: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const a = SAMPLE_ANALYSIS;

  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-title-2">Here’s what you’ll get</h2>
          <p className="mt-1 text-[14px] text-label-2">
            An example for {SAMPLE_PROFILE_PHRASE}. Hover any step to trace how the shock travels.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenExample} className="shrink-0">
          Open full example <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 border-t border-line px-6 py-6 sm:flex-row sm:items-center">
        <div className="shrink-0 scale-90">
          <RiskGauge score={a.riskScore} />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-headline">{a.headline}</p>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-label-2">{a.exposure}</p>
        </div>
      </div>

      <div className="border-t border-line px-6 py-8">
        <CascadeFlowchart data={a} selectedId={selected} onSelect={setSelected} />
      </div>

      <dl className="grid border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
        {PARTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 px-6 py-5">
            <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={1.8} />
            <div>
              <dt className="text-[14px] font-medium text-label">{title}</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-label-2">{text}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}
