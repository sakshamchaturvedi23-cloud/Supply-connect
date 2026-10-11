'use client';

import React from 'react';
import {
  Bookmark,
  Calendar,
  Crosshair,
  ExternalLink,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react';
import { CategoryKey, Disruption, articleLink, categoryMeta, imageFor } from '@/lib/disruptions';
import { resolveLocation } from '@/lib/locationMapping';
import { decodeEntities, parseImpact, relativeTime } from '@/lib/text';
import { SeverityBadge } from '@/components/ui/Badge';
import { ButtonLink, IconButton, buttonClass } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

interface SignalDetailDrawerProps {
  item: (Disruption & { bucket: CategoryKey }) | null;
  onClose: () => void;
  saved: boolean;
  onToggleSave: (item: Disruption) => void;
  className?: string;
}

export function SignalDetailDrawer({
  item,
  onClose,
  saved,
  onToggleSave,
  className,
}: SignalDetailDrawerProps) {
  if (!item) return null;

  const resolvedLoc = resolveLocation(item.location);
  const action = parseImpact(item.impact)[0];
  const article = articleLink(item);

  return (
    <aside
      className={cn(
        'flex flex-col liquid-glass-strong shadow-2xl overflow-hidden',
        className,
      )}
      aria-label="Signal Intelligence Dossier"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <SeverityBadge value={item.severity} />
          <span className="text-[12px] font-medium text-white/60">
            {categoryMeta(item.bucket).short}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            aria-label={saved ? 'Remove from saved' : 'Save signal'}
            aria-pressed={saved}
            onClick={() => onToggleSave(item)}
            className={cn('text-white/60 hover:text-white', saved && 'text-white')}
          >
            <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
          </IconButton>
          <IconButton
            aria-label="Close dossier"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Signal Hero Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/40 border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageFor(item, item.bucket)}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-[17px] font-medium leading-snug text-white">
            {decodeEntities(item.title)}
          </h2>

          {item.created_at && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/50">
              <Calendar className="h-3 w-3" />
              Published {relativeTime(new Date(item.created_at).getTime())}
            </p>
          )}
        </div>

        {/* Location Honesty Card */}
        <div className="rounded-xl liquid-glass p-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-white/70" />
            <span className="text-[12px] font-medium text-white/90">
              Geographic Scope: {decodeEntities(item.location || 'Unspecified')}
            </span>
          </div>

          {resolvedLoc.mapped ? (
            <div className="text-[12px] text-white/80">
              <p className="flex items-center gap-1 font-medium text-white">
                <Crosshair className="h-3 w-3 text-white/70" />
                {resolvedLoc.precisionLabel}
              </p>
              <p className="text-white/60 mt-0.5">
                Approximate mapped node: <strong className="text-white font-medium">{resolvedLoc.normalizedName}</strong>
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-white/60">
              🌐 Unmapped: {resolvedLoc.reason}. Positioned in general feed without guessed coordinates.
            </p>
          )}
        </div>

        {/* AI Intelligence Assessment */}
        {item.description && (
          <div>
            <h4 className="flex items-center gap-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-white/50">
              <Sparkles className="h-3.5 w-3.5 text-white/70" />
              AI Intelligence Assessment
            </h4>
            <p className="mt-2 text-[14px] leading-relaxed text-white/70">
              {decodeEntities(item.description)}
            </p>
          </div>
        )}

        {/* Recommended Action Plan */}
        {action && (
          <div className="rounded-xl liquid-glass p-4">
            <h4 className="text-[11px] font-mono font-medium uppercase tracking-wider text-white">
              {action.label || 'Recommended Operational Action'}
            </h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">
              {action.text}
            </p>
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="border-t border-white/10 p-5 space-y-2.5">
        <ButtonLink
          href={`/startup-advisor?id=${item.id}`}
          variant="primary"
          size="md"
          className="w-full justify-center font-medium transition-all shadow-md"
        >
          Plan a response with Advisor
        </ButtonLink>

        <a
          href={article.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonClass('secondary', 'md'), 'w-full justify-center gap-2 liquid-glass text-white/80 hover:text-white')}
        >
          {article.isSource ? 'Read original news article' : 'Search headline coverage'}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </aside>
  );
}

