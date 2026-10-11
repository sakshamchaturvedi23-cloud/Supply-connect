import React from 'react';
import { Cpu } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { RiskGauge } from '@/components/copilot/RiskGauge';
import { Metrics } from './Metrics';
import type { ImpactAnalysis } from '@/lib/impact-schema';

export function RiskScore({
  analysis,
  profession,
  modelUsed,
}: {
  analysis: ImpactAnalysis;
  profession: string;
  modelUsed?: string;
}) {
  return (
    <Card className="grid gap-6 p-6 lg:grid-cols-[auto_1fr] lg:gap-10">
      <div className="flex flex-col items-center justify-center lg:border-r lg:border-line lg:pr-10">
        <RiskGauge score={analysis.riskScore} />
      </div>

      <div className="min-w-0 space-y-4">
        <div>
          <span className="text-xs font-mono font-medium text-accent">
            EXPOSURE PROJECTION: {profession}
          </span>
          <h2 className="mt-1 text-title-2 font-semibold text-label tracking-tight">
            {analysis.headline}
          </h2>
          {analysis.exposure && (
            <p className="mt-2 max-w-2xl text-body text-label-2 leading-relaxed">
              {analysis.exposure}
            </p>
          )}
        </div>

        <Metrics metrics={analysis.metrics} />

        {modelUsed && (
          <p className="flex items-center gap-1.5 text-[11px] font-mono text-label-3 pt-2">
            <Cpu className="h-3 w-3" /> Synthesized via {modelUsed}
          </p>
        )}
      </div>
    </Card>
  );
}

