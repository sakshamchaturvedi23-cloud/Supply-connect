import { Clock } from 'lucide-react';
import type { ImpactAnalysis, Priority } from '@/lib/impact-schema';
import { cn } from '@/components/ui/cn';

const PRIORITY: Record<Priority, { label: string; className: string }> = {
  P0: { label: 'Do now', className: 'bg-critical/15 text-critical' },
  P1: { label: 'Next', className: 'bg-high/15 text-high' },
  P2: { label: 'Later', className: 'bg-surface-3 text-label-2' },
};

/** Three phases in time order — the numbering here is a real sequence. */
export function Playbook({ data }: { data: ImpactAnalysis }) {
  return (
    <ol className="grid gap-4 lg:grid-cols-3">
      {data.playbook.map((ph, i) => (
        <li key={i} className="rounded-card bg-surface p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[14px] font-semibold text-white">{i + 1}</span>
            <div>
              <p className="text-headline">{ph.phase}</p>
              <p className="flex items-center gap-1 text-[13px] text-label-3">
                <Clock className="h-3.5 w-3.5" /> {ph.horizon}
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {ph.actions.map((a, j) => (
              <li key={j} className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-medium text-label">{a.title}</p>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', PRIORITY[a.priority].className)} title={a.priority}>
                    {PRIORITY[a.priority].label}
                  </span>
                </div>
                {a.detail && <p className="mt-1.5 text-[13px] leading-relaxed text-label-2">{a.detail}</p>}
                {a.owner && <p className="mt-2 text-[12px] text-label-3">Owner: {a.owner}</p>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
