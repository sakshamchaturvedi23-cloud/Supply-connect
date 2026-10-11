import React from 'react';
import { MapPin } from 'lucide-react';
import { Disruption } from '@/lib/disruptions';
import { decodeEntities, parseImpact } from '@/lib/text';
import { SeverityBadge } from '@/components/ui/Badge';

export function AdvisorContext({ disruption }: { disruption: Disruption }) {
  const action = parseImpact(disruption.impact)[0];

  return (
    <section aria-label="Signal under analysis" className="mb-6 rounded-2xl liquid-glass-strong p-4 shadow-xl">
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <SeverityBadge value={disruption.severity} />
        {disruption.location && (
          <span className="flex items-center gap-1 text-white/50">
            <MapPin className="h-3.5 w-3.5 text-white/40" /> {decodeEntities(disruption.location)}
          </span>
        )}
      </div>

      <h2 className="mt-2 text-sm font-medium text-white tracking-tight">
        {decodeEntities(disruption.title)}
      </h2>

      {action && (
        <div className="mt-2 rounded-xl liquid-glass p-2.5 text-xs leading-relaxed text-white/80">
          {action.label && <span className="font-medium text-white/60">{action.label}: </span>}
          {action.text}
        </div>
      )}
    </section>
  );
}

