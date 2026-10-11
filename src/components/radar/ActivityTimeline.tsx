'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Info, Pause, Play, RotateCcw } from 'lucide-react';
import { Disruption } from '@/lib/disruptions';
import { cn } from '@/components/ui/cn';

interface ActivityTimelineProps {
  disruptions: Disruption[];
  maxDateTimestamp: number | null; // null means 'Show All'
  onChangeMaxDate: (timestamp: number | null) => void;
  className?: string;
}

export function ActivityTimeline({
  disruptions,
  maxDateTimestamp,
  onChangeMaxDate,
  className,
}: ActivityTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract valid publication timestamps
  const timestamps = useMemo(() => {
    return disruptions
      .map((d) => (d.created_at ? new Date(d.created_at).getTime() : 0))
      .filter((t) => t > 0)
      .sort((a, b) => a - b);
  }, [disruptions]);

  const { minTime, maxTime, timeSpan } = useMemo(() => {
    const min = timestamps.length > 0 ? timestamps[0] : 0;
    const max = timestamps.length > 0 ? timestamps[timestamps.length - 1] : 1;
    return {
      minTime: min,
      maxTime: max,
      timeSpan: Math.max(1, max - min),
    };
  }, [timestamps]);

  // Current scrubber value
  const currentTime = maxDateTimestamp ?? maxTime;

  // Active signals count at current time cut-off
  const activeCount = useMemo(() => {
    if (maxDateTimestamp === null) return disruptions.length;
    return disruptions.filter((d) => {
      const t = d.created_at ? new Date(d.created_at).getTime() : 0;
      return t <= maxDateTimestamp;
    }).length;
  }, [disruptions, maxDateTimestamp]);

  // Histogram buckets (12 density bins along the timeline)
  const densityBins = useMemo(() => {
    const bins = Array.from({ length: 14 }, () => 0);
    if (timeSpan <= 0) return bins;

    for (const t of timestamps) {
      const normalized = Math.min(13, Math.max(0, Math.floor(((t - minTime) / timeSpan) * 14)));
      bins[normalized]++;
    }
    const maxBin = Math.max(1, ...bins);
    return bins.map((c) => Math.max(0.15, c / maxBin));
  }, [timestamps, minTime, timeSpan]);

  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Auto-play timeline step
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const curr = currentTimeRef.current;
      const step = timeSpan / 20;
      const next = curr + step;
      if (next >= maxTime) {
        setIsPlaying(false);
        onChangeMaxDate(null);
      } else {
        onChangeMaxDate(next);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [isPlaying, minTime, maxTime, timeSpan, onChangeMaxDate]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className={cn(
        'rounded-2xl liquid-glass-strong p-4 shadow-xl',
        className,
      )}
    >
      {/* Header with Title and Strict Transparency Disclaimer */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-white/70" />
          <h3 className="text-[13px] font-medium tracking-wide text-white">
            Publication Activity Timeline
          </h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono font-medium text-white/60">
            {activeCount} of {disruptions.length} signals
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg liquid-glass px-2.5 py-1 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3 fill-current" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                Playback
              </>
            )}
          </button>

          {maxDateTimestamp !== null && (
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onChangeMaxDate(null);
              }}
              className="flex items-center gap-1 rounded-lg liquid-glass px-2 py-1 text-[11px] font-medium text-white/60 transition-colors hover:text-white"
              title="Show all active signals"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Visual Density Histogram & Slider */}
      <div className="mt-3.5 space-y-1.5">
        {/* Event density bars */}
        <div className="flex h-5 items-end gap-1 px-1">
          {densityBins.map((heightRatio, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-200"
              style={{
                height: `${heightRatio * 100}%`,
                backgroundColor:
                  maxDateTimestamp === null || i / 14 <= (currentTime - minTime) / timeSpan
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(255, 255, 255, 0.12)',
                opacity: maxDateTimestamp === null || i / 14 <= (currentTime - minTime) / timeSpan ? 0.9 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={minTime}
          max={maxTime}
          step={Math.max(1, timeSpan / 100)}
          value={currentTime}
          onChange={(e) => {
            setIsPlaying(false);
            onChangeMaxDate(Number(e.target.value));
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-white"
        />

        {/* Timeline Range Labels */}
        <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
          <span>{formatDate(minTime)}</span>
          <span className="font-medium text-white/90">
            {maxDateTimestamp === null ? 'All time active' : `Up to ${formatDate(currentTime)}`}
          </span>
          <span>{formatDate(maxTime)}</span>
        </div>
      </div>

      {/* Explicit Honesty Caption */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/50 border-t border-white/10 pt-2">
        <Info className="h-3 w-3 shrink-0 text-white/40" />
        <span>
          Filters signals strictly by article publication date stored in database. Not predictive forecast playback.
        </span>
      </div>
    </div>
  );
}

