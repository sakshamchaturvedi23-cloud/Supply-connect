'use client';

import React, { memo } from 'react';
import { ArrowUpRight, Bookmark, MapPin } from 'lucide-react';
import { CategoryKey, Disruption, FALLBACK_IMAGE, articleLink, categoryMeta, imageFor } from '@/lib/disruptions';
import { decodeEntities, parseImpact } from '@/lib/text';
import { SeverityBadge } from '@/components/ui/Badge';
import { ButtonLink, IconButton, buttonClass } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

type Props = {
  item: Disruption & { bucket: CategoryKey };
  saved: boolean;
  onToggleSave: (item: Disruption) => void;
};

function SignalCardImpl({ item, saved, onToggleSave }: Props) {
  const action = parseImpact(item.impact)[0];
  const article = articleLink(item);
  return (
    <article
      id={`card-${item.id}`}
      className="flex flex-col overflow-hidden rounded-2xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl transition-all hover:border-white/20 hover:bg-[#0e121d]/70 data-[flash=true]:ring-2 data-[flash=true]:ring-white"
    >
      <div className="relative aspect-[16/9] bg-black/40 border-b border-white/[0.07]">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote RSS images from arbitrary hosts */}
        <img
          src={imageFor(item, item.bucket)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src !== FALLBACK_IMAGE) el.src = FALLBACK_IMAGE;
            else el.style.visibility = 'hidden';
          }}
          className="h-full w-full object-cover"
        />
        <IconButton
          aria-label={saved ? 'Remove from saved' : 'Save signal'}
          aria-pressed={saved}
          onClick={() => onToggleSave(item)}
          className={cn('absolute right-3 top-3 rounded-full bg-black/60 p-2 backdrop-blur-md text-white/70 hover:text-white border border-white/15 transition-colors', saved && 'text-white')}
        >
          <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
        </IconButton>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-[13px]">
          <SeverityBadge value={item.severity} />
          <span className="text-[12px] font-medium text-slate-400 font-mono">{categoryMeta(item.bucket).short}</span>
        </div>

        <h3 className="mt-2.5 text-[15px] font-semibold text-white leading-snug line-clamp-2">{decodeEntities(item.title)}</h3>

        {item.location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-white/40" />
            {decodeEntities(item.location)}
          </p>
        )}

        {item.description && <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-white/70">{decodeEntities(item.description)}</p>}

        {action && (
          <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
            {action.label && <p className="text-[11px] font-mono text-slate-400">{action.label}</p>}
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-white/90">{action.text}</p>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-5">
          <ButtonLink href={`/startup-advisor?id=${item.id}`} variant="primary" size="sm" className="flex-1 font-medium shadow-md">
            Plan a response
          </ButtonLink>
          <a
            href={article.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonClass('secondary', 'sm'), 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white')}
            title={article.isSource ? 'Open the original article' : 'Search news for this headline'}
          >
            {article.isSource ? 'Read article' : 'Find article'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export const SignalCard = memo(SignalCardImpl);
