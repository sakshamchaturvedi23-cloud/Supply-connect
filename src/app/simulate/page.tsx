'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SeverityKey } from '@/lib/disruptions';
import { PageContainer, PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { SeverityBadge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/Controls';

type Industry = 'Electronics' | 'Automotive' | 'Pharma';

const COMPONENTS = [
  { value: 'Semiconductors', label: 'Semiconductors and microchips' },
  { value: 'Lithium-ion', label: 'Lithium-ion battery cells' },
  { value: 'Raw Steel', label: 'Raw industrial steel' },
];

function riskFor(days: number): SeverityKey {
  if (days >= 14) return 'critical';
  if (days >= 7) return 'high';
  return 'medium';
}

export default function SimulatorPage() {
  const [industry, setIndustry] = useState<Industry>('Electronics');
  const [component, setComponent] = useState('Semiconductors');
  const [duration, setDuration] = useState(7);
  const risk = riskFor(duration);
  const componentLabel = COMPONENTS.find((c) => c.value === component)?.label.toLowerCase() ?? component;

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="What-if simulator" description="Pick an industry, a critical input and how long it’s cut off, and see the likely downstream effect." />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card className="space-y-8 p-6">
          <div>
            <p className="mb-3 text-[13px] font-medium text-label-2">Industry</p>
            <SegmentedControl<Industry>
              label="Industry"
              trackClassName="bg-canvas"
              value={industry}
              onChange={setIndustry}
              options={(['Electronics', 'Automotive', 'Pharma'] as Industry[]).map((v) => ({ value: v, label: v }))}
            />
          </div>

          <div>
            <label htmlFor="component" className="mb-3 block text-[13px] font-medium text-label-2">
              Critical input
            </label>
            <select
              id="component"
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className="h-11 w-full rounded-xl bg-surface-2 px-4 text-[15px] text-label outline-none focus:ring-2 focus:ring-accent/60"
            >
              {COMPONENTS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="duration" className="text-[13px] font-medium text-label-2">
                Disruption length
              </label>
              <span className="text-title-2 tabular-nums">{duration} days</span>
            </div>
            <input
              id="duration"
              type="range"
              min={3}
              max={30}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-[#0a84ff]"
            />
            <div className="mt-1 flex justify-between text-[12px] text-label-3">
              <span>3 days</span>
              <span>30 days</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-6" aria-live="polite">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-label-2">Result</p>
            <SeverityBadge value={risk} className="text-[14px]" />
          </div>

          <p className="mt-4 text-title-2">
            A {duration}-day shortage of {componentLabel} in {industry.toLowerCase()}.
          </p>

          <dl className="mt-6 space-y-5">
            <div>
              <dt className="text-[12px] text-label-3">Likely downstream impact</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-label">
                {duration > 10
                  ? 'Production slows, delivery dates slip and spot-market prices climb.'
                  : 'Safety stock runs down and some orders need rescheduling, but output holds.'}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-label-3">What to do</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-label">
                Line up a secondary regional supplier and pre-allocate buffer stock before you raise purchase orders.
              </dd>
            </div>
          </dl>

          <p className="mt-auto pt-8 text-[13px] text-label-3">
            This is a rule-of-thumb estimate. For an analysis of your own business, use{' '}
            <Link href="/impact-copilot" className="text-accent hover:underline">
              Impact Copilot
            </Link>
            .
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}
