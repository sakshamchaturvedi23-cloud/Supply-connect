import { ArrowRight, X } from 'lucide-react';
import { ImpactAnalysis, LEVEL_ORDER } from '@/lib/impact-schema';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { LEVEL_THEME } from './theme';

export function NodeDetail({ data, id, onClose }: { data: ImpactAnalysis; id: string; onClose: () => void }) {
  const all = LEVEL_ORDER.flatMap((k) => data.levels[k].nodes.map((n) => ({ ...n, level: k })));
  const node = all.find((n) => n.id === id);
  if (!node) return null;
  const t = LEVEL_THEME[node.level];
  const name = (nid: string) => all.find((n) => n.id === nid)?.title ?? nid;
  const columns = [
    { title: 'Caused by', items: data.links.filter((l) => l.to === id).map((l) => ({ n: name(l.from), label: l.label })) },
    { title: 'Leads to', items: data.links.filter((l) => l.from === id).map((l) => ({ n: name(l.to), label: l.label })) },
  ];

  return (
    <div className="rounded-3xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] p-6 shadow-2xl" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn('text-[13px] font-medium', t.text)}>
            {t.label}, <span className="capitalize">{node.severity}</span> severity
          </p>
          <h4 className="mt-1 text-headline text-white font-medium">{node.title}</h4>
        </div>
        <IconButton aria-label="Close details" onClick={onClose} className="text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {node.detail && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-300">{node.detail}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {columns.map((col) => (
          <div key={col.title} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[12px] font-medium text-white/50 font-mono uppercase tracking-wider">{col.title}</p>
            {col.items.length === 0 ? (
              <p className="mt-2 text-[13px] text-white/50">Nothing upstream or downstream.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {col.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-white/70">
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span className="font-medium text-white">{it.n}</span>
                    {it.label && <span className="text-white/40">({it.label})</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
