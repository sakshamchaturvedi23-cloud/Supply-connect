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
      className="flex flex-col overflow-hidden rounded-card bg-surface transition-shadow duration-500 data-[flash=true]:ring-2 data-[flash=true]:ring-accent data-[flash=true]:ring-offset-4 data-[flash=true]:ring-offset-canvas"
    >
      <div className="relative aspect-[16/9] bg-surface-2">
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
          className={cn('material absolute right-3 top-3 text-label', saved && 'text-accent')}
        >
          <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
        </IconButton>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3 text-[13px]">
          <SeverityBadge value={item.severity} />
          <span className="text-label-3">{categoryMeta(item.bucket).short}</span>
        </div>

        <h3 className="mt-2.5 text-headline text-label">{decodeEntities(item.title)}</h3>

        {item.location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-label-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-label-3" />
            {decodeEntities(item.location)}
          </p>
        )}

        {item.description && <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-label-2">{decodeEntities(item.description)}</p>}

        {action && (
          <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5">
            {action.label && <p className="text-[12px] font-medium text-label-3">{action.label}</p>}
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-label-2">{action.text}</p>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-5">
          <ButtonLink href={`/startup-advisor?id=${item.id}`} size="sm" className="flex-1">
            Plan a response
          </ButtonLink>
          <a
            href={article.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass('secondary', 'sm')}
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
