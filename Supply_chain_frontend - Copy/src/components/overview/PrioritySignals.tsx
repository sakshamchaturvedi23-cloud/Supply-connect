'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Disruption } from '@/lib/disruptions';
import { SectionHeading } from '@/components/ui/Card';
import { RoundRiskCarousel } from './RoundRiskCarousel';

export function PrioritySignals({
  signals,
  status,
  onRetry,
}: {
  signals: Disruption[];
  status: 'loading' | 'ready' | 'error';
  onRetry?: () => void;
}) {
  return (
    <section className="min-w-0">
      <SectionHeading
        title="Highest risk signals"
        description="Active supply bottlenecks ranked by operational severity"
        action={
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            <span>Open radar</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        }
      />
      <RoundRiskCarousel data={signals} status={status} onRetry={onRetry} />
    </section>
  );
}
