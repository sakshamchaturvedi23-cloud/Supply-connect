import React from 'react';
import { LEVEL_THEME } from '@/components/copilot/theme';
import { LEVEL_ORDER, LevelKey } from '@/lib/impact-schema';

export function ThemeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-3 text-xs">
      <span className="font-mono text-label-3 font-semibold uppercase text-[11px]">Causal Flow:</span>
      {LEVEL_ORDER.map((k: LevelKey, idx: number) => {
        const t = LEVEL_THEME[k];
        return (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.hex }} />
            <span className="font-medium text-label">{t.label}: {t.name}</span>
            {idx < LEVEL_ORDER.length - 1 && <span className="text-label-3 ml-2">→</span>}
          </div>
        );
      })}
    </div>
  );
}

