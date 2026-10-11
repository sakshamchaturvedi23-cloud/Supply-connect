import { Clock } from 'lucide-react';
import type { ImpactAnalysis, Priority } from '@/lib/impact-schema';
import { cn } from '@/components/ui/cn';

const PRIORITY: Record<Priority, { label: string; className: string }> = {
  P0: { label: 'Do now', className: 'bg-white text-black font-medium' },
  P1: { label: 'Next', className: 'bg-white/20 text-white font-medium border border-white/20' },
  P2: { label: 'Later', className: 'bg-white/10 text-white/70 border border-white/10' },
};

/** Three phases in time order — the numbering here is a real sequence. */
export function Playbook({ data }: { data: ImpactAnalysis }) {
  return (
    <ol className="grid gap-4 lg:grid-cols-3">
      {data.playbook.map((ph, i) => (
        <li key={i} className="rounded-3xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[14px] font-semibold text-black">{i + 1}</span>
            <div>
              <p className="text-headline text-white font-medium">{ph.phase}</p>
              <p className="flex items-center gap-1 text-[13px] text-slate-400">
                <Clock className="h-3.5 w-3.5" /> {ph.horizon}
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {ph.actions.map((a, j) => (
              <li key={j} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 transition-all hover:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-medium text-white">{a.title}</p>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px]', PRIORITY[a.priority].className)} title={a.priority}>
                    {PRIORITY[a.priority].label}
                  </span>
                </div>
                {a.detail && <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{a.detail}</p>}
                {a.owner && <p className="mt-2 text-[12px] text-slate-400 font-mono">Owner: {a.owner}</p>}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
