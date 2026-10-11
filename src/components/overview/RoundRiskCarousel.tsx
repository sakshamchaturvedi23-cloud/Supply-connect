'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  ExternalLink,
  Globe2,
  MapPin,
  Network,
  Pause,
  Play,
  RotateCw,
  ShieldAlert,
  Ship,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  CategoryKey,
  Disruption,
  bySeverityThenDate,
  categorize,
  categoryMeta,
  severityOf,
} from '@/lib/disruptions';
import { decodeEntities, relativeTime, truncate } from '@/lib/text';
import { useSavedSignals } from '@/lib/saved';
import { SeverityBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';

interface RoundRiskCarouselProps {
  data: Disruption[];
  status: 'loading' | 'ready' | 'error';
  onRetry?: () => void;
  className?: string;
}

const CATEGORY_ICON: Record<CategoryKey, React.ComponentType<{ className?: string }>> = {
  'AI Chips & Core Tech Hardware': Cpu,
  'Logistics & Freight Volatility': Ship,
  'Price Spikes & Raw Material Inflation': TrendingUp,
  'Corporate Policy & Supply Shifts': Globe2,
};

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeVisibility(callback: () => void) {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}
function getVisibilitySnapshot() {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
}
function getVisibilityServerSnapshot() {
  return true;
}

export function RoundRiskCarousel({
  data,
  status,
  onRetry,
  className,
}: RoundRiskCarouselProps) {
  const carouselId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Top 6 priority records sorted by severity then date
  const risks = useMemo(() => {
    return [...data].sort(bySeverityThenDate).slice(0, 6);
  }, [data]);

  const count = risks.length;
  const angleStep = count > 0 ? 360 / count : 60;

  // Responsive dimensions for 3D stage
  const [dimensions, setDimensions] = useState({
    width: 600,
    cardWidth: 260,
    cardHeight: 330,
    radius: 270,
    perspective: 1000,
  });

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w < 440) {
        setDimensions({
          width: w,
          cardWidth: Math.min(220, w - 40),
          cardHeight: 300,
          radius: 180,
          perspective: 800,
        });
      } else if (w < 680) {
        setDimensions({
          width: w,
          cardWidth: 240,
          cardHeight: 320,
          radius: 230,
          perspective: 950,
        });
      } else {
        setDimensions({
          width: w,
          cardWidth: 270,
          cardHeight: 340,
          radius: 280,
          perspective: 1100,
        });
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Continuous rotation angle in degrees
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);

  // Pointer drag tracking
  const dragStartRef = useRef({ x: 0, y: 0, angle: 0, time: 0 });
  const lastDragRef = useRef({ x: 0, time: 0 });
  const velocityRef = useRef(0);
  const momentumRafRef = useRef<number | null>(null);
  const autoRotateRafRef = useRef<number | null>(null);

  // Saved signals bookmark hook
  const { isSaved, toggle } = useSavedSignals();

  // Detect prefers-reduced-motion via useSyncExternalStore
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Tab visibility via useSyncExternalStore
  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot
  );

  // IntersectionObserver to pause when off-screen
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate normalized offset angle [-180, 180] for each card
  const getCardOffset = useCallback(
    (index: number, currentAngle: number) => {
      if (count === 0) return 0;
      const baseAngle = index * angleStep;
      let diff = (baseAngle + currentAngle) % 360;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return diff;
    },
    [count, angleStep]
  );

  // Active index: the card currently closest to center-front
  const activeIndex = useMemo(() => {
    if (count === 0) return 0;
    let closestIndex = 0;
    let minOffset = 9999;
    for (let i = 0; i < count; i++) {
      const offset = Math.abs(getCardOffset(i, rotationAngle));
      if (offset < minOffset) {
        minOffset = offset;
        closestIndex = i;
      }
    }
    return closestIndex;
  }, [count, rotationAngle, getCardOffset]);

  // Smoothly snap to a target card
  const snapToCard = useCallback(
    (targetIndex: number) => {
      if (count === 0) return;
      if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);

      const offset = getCardOffset(targetIndex, rotationAngle);
      const targetAngle = rotationAngle - offset;
      const startAngle = rotationAngle;
      const duration = prefersReducedMotion ? 1 : 280;
      const startTime = performance.now();

      const animateSnap = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        const nextAngle = startAngle + (targetAngle - startAngle) * ease;
        setRotationAngle(nextAngle);

        if (progress < 1) {
          momentumRafRef.current = requestAnimationFrame(animateSnap);
        } else {
          setRotationAngle(targetAngle);
          momentumRafRef.current = null;
        }
      };

      momentumRafRef.current = requestAnimationFrame(animateSnap);
    },
    [count, getCardOffset, rotationAngle, prefersReducedMotion]
  );

  const stepPrev = useCallback(() => {
    if (count === 0) return;
    const nextIdx = (activeIndex - 1 + count) % count;
    snapToCard(nextIdx);
  }, [count, activeIndex, snapToCard]);

  const stepNext = useCallback(() => {
    if (count === 0) return;
    const nextIdx = (activeIndex + 1) % count;
    snapToCard(nextIdx);
  }, [count, activeIndex, snapToCard]);

  // Subtle auto-rotation loop
  useEffect(() => {
    const shouldRotate =
      count > 1 &&
      !isPaused &&
      !isHovered &&
      !isFocused &&
      !isDragging &&
      !prefersReducedMotion &&
      isInViewport &&
      tabVisible;

    if (!shouldRotate) {
      if (autoRotateRafRef.current) cancelAnimationFrame(autoRotateRafRef.current);
      return;
    }

    let lastTimestamp = performance.now();
    const ROTATE_SPEED = 0.035;

    const step = (now: number) => {
      const dt = Math.min(50, now - lastTimestamp);
      lastTimestamp = now;
      const delta = (dt / 16.67) * ROTATE_SPEED;
      setRotationAngle((prev) => prev - delta);
      autoRotateRafRef.current = requestAnimationFrame(step);
    };

    autoRotateRafRef.current = requestAnimationFrame(step);

    return () => {
      if (autoRotateRafRef.current) cancelAnimationFrame(autoRotateRafRef.current);
    };
  }, [
    count,
    isPaused,
    isHovered,
    isFocused,
    isDragging,
    prefersReducedMotion,
    isInViewport,
    tabVisible,
  ]);

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (count <= 1) return;
    if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      angle: rotationAngle,
      time: performance.now(),
    };
    lastDragRef.current = { x: e.clientX, time: performance.now() };
    velocityRef.current = 0;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || count <= 1) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastDragRef.current.time);
    const dx = e.clientX - lastDragRef.current.x;

    const degPerPx = 0.28;
    const dAngle = dx * degPerPx;

    setRotationAngle((prev) => prev + dAngle);
    velocityRef.current = (dAngle / dt) * 16.67;
    lastDragRef.current = { x: e.clientX, time: now };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const totalDx = Math.abs(e.clientX - dragStartRef.current.x);
    if (totalDx < 6) return;

    const friction = 0.92;
    let currentVel = velocityRef.current;
    if (Math.abs(currentVel) > 8) currentVel = Math.sign(currentVel) * 8;

    const runMomentum = () => {
      currentVel *= friction;
      if (Math.abs(currentVel) > 0.08) {
        setRotationAngle((prev) => prev + currentVel);
        momentumRafRef.current = requestAnimationFrame(runMomentum);
      } else {
        setRotationAngle((prev) => {
          let bestIdx = 0;
          let bestDiff = 9999;
          for (let i = 0; i < count; i++) {
            const diff = Math.abs(getCardOffset(i, prev));
            if (diff < bestDiff) {
              bestDiff = diff;
              bestIdx = i;
            }
          }
          const offset = getCardOffset(bestIdx, prev);
          return prev - offset;
        });
        momentumRafRef.current = null;
      }
    };

    momentumRafRef.current = requestAnimationFrame(runMomentum);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepNext();
    } else if (e.key === 'Home') {
      e.preventDefault();
      snapToCard(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      snapToCard(count - 1);
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsPaused((p) => !p);
    }
  };

  const activeRisk = risks[activeIndex] || null;

  if (status === 'loading') {
    return (
      <div className={cn('relative overflow-hidden rounded-3xl liquid-glass-strong p-6', className)}>
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28 bg-white/10" />
            <Skeleton className="h-4 w-16 bg-white/10" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
        </div>
        <div className="my-10 flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <RotateCw className="h-6 w-6 animate-spin text-white/70" />
            <p className="text-xs font-mono text-white/50">Loading priority telemetry…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn('relative overflow-hidden rounded-3xl liquid-glass-strong p-8 text-center', className)}>
        <AlertTriangle className="mx-auto h-8 w-8 text-white/80" />
        <h3 className="mt-3 text-sm font-medium text-white">Unable to Load Priority Signals</h3>
        <p className="mt-1.5 text-xs text-white/60 max-w-md mx-auto">
          Couldn’t connect to live disruption data. Retry synchronization or explore the map.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15 transition-colors"
            >
              Retry Connection
            </button>
          )}
          <Link
            href="/explore"
            className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Open Disruption Radar
          </Link>
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className={cn('relative overflow-hidden rounded-3xl liquid-glass-strong p-8 text-center', className)}>
        <ShieldAlert className="mx-auto h-8 w-8 text-white/40" />
        <h3 className="mt-3 text-sm font-medium text-white">No Critical Risks Detected</h3>
        <p className="mt-1 text-xs text-white/60 max-w-sm mx-auto">
          All monitored logistics corridors, tech supply chains, and commodities are currently stable.
        </p>
        <div className="mt-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15 transition-colors"
          >
            <span>Explore All Signals</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      id={carouselId}
      ref={containerRef}
      className={cn(
        'relative flex flex-col rounded-3xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] shadow-2xl overflow-hidden',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Highest risk supply chain signals"
      onKeyDown={handleKeyDown}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-6 py-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-white/80">
              Priority Telemetry Orbit
            </span>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-mono text-white/70">
            {count} critical signals
          </span>
        </div>

        {/* Carousel Micro Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            title={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={stepPrev}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Previous risk signal"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={stepNext}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Next risk signal"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Cylindrical Ring Stage */}
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'relative flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing',
          'h-[380px] sm:h-[420px]'
        )}
        style={{
          perspective: `${dimensions.perspective}px`,
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Subtle Ambient Depth Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20"
        >
          <div className="h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        </div>

        {/* 3D Rotating Ring */}
        <div
          className="relative h-full w-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: `translateZ(-${dimensions.radius}px) rotateY(${rotationAngle}deg)`,
            transition: isDragging ? 'none' : 'transform 0.05s linear',
          }}
        >
          {risks.map((item, idx) => {
            const offset = getCardOffset(idx, rotationAngle);
            const absOffset = Math.abs(offset);
            const isActive = idx === activeIndex;
            const baseAngle = idx * angleStep;
            const bucket = categorize(item);
            const CategoryIcon = CATEGORY_ICON[bucket] || Globe2;
            const saved = isSaved(item.id);

            let opacity = 1;
            let zIndex = 20;
            let filter = 'none';

            if (absOffset > 75) {
              opacity = 0.3;
              zIndex = 5;
              filter = 'brightness(0.6)';
            } else if (absOffset > 25) {
              opacity = 0.75;
              zIndex = 10;
              filter = 'brightness(0.85)';
            }

            return (
              <div
                key={item.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${severityOf(item.severity)}: ${decodeEntities(item.title)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isActive) {
                    snapToCard(idx);
                  }
                }}
                className={cn(
                  'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200',
                  'rounded-2xl text-left flex flex-col overflow-hidden',
                  isActive
                    ? 'liquid-glass-strong border border-white/40 shadow-[0_0_35px_rgba(255,255,255,0.08)] ring-1 ring-white/30'
                    : 'liquid-glass hover:opacity-90'
                )}
                style={{
                  width: `${dimensions.cardWidth}px`,
                  height: `${dimensions.cardHeight}px`,
                  transform: `rotateY(${baseAngle}deg) translateZ(${dimensions.radius}px)`,
                  opacity,
                  zIndex,
                  filter,
                  backfaceVisibility: 'hidden',
                  cursor: isActive ? 'default' : 'pointer',
                }}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/30 px-3.5 py-2.5">
                  <SeverityBadge value={item.severity} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(item);
                    }}
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-md border border-white/15 bg-white/5 text-white/50 hover:text-white transition-colors',
                      saved && 'text-white border-white/40 bg-white/20'
                    )}
                    aria-label={saved ? 'Remove from saved signals' : 'Save signal'}
                    title={saved ? 'Saved' : 'Save signal'}
                  >
                    <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current')} />
                  </button>
                </div>

                {/* Card Image or Monochrome Fallback */}
                <CardImageSection item={item} bucket={bucket} CategoryIcon={CategoryIcon} />

                {/* Card Content Body */}
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    {/* Category & Time */}
                    <div className="flex items-center justify-between text-[11px] text-white/50 mb-1.5">
                      <span className="flex items-center gap-1 font-medium text-white/70">
                        <CategoryIcon className="h-3 w-3 text-white/80" />
                        <span className="truncate">{categoryMeta(bucket).short}</span>
                      </span>
                      {item.created_at && (
                        <span className="font-mono text-[10px] text-white/40">
                          {relativeTime(item.created_at)}
                        </span>
                      )}
                    </div>

                    {/* Headline */}
                    <h4 className="text-[13px] font-medium leading-snug text-white line-clamp-2">
                      {decodeEntities(item.title)}
                    </h4>

                    {/* Location */}
                    {item.location && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-white/50">
                        <MapPin className="h-3 w-3 shrink-0 text-white/40" />
                        <span className="truncate">{decodeEntities(item.location)}</span>
                      </p>
                    )}
                  </div>

                  {/* Impact Summary */}
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                      {item.impact
                        ? truncate(decodeEntities(item.impact), 100)
                        : item.description
                          ? truncate(decodeEntities(item.description), 90)
                          : 'Operational impact monitored.'}
                    </p>
                  </div>
                </div>

                {/* Card Footer Status */}
                <div
                  className={cn(
                    'px-3.5 py-1.5 text-[10px] font-mono flex items-center justify-between border-t',
                    isActive
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-black/20 border-white/[0.04] text-white/40'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isActive ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        <span>Focused Risk</span>
                      </>
                    ) : (
                      <span>Click to focus</span>
                    )}
                  </span>
                  <span>{idx + 1} / {count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Risk Inspection Dock */}
      {activeRisk && (
        <div className="border-t border-white/[0.08] bg-black/40 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-3.5">
            {/* Header info row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SeverityBadge value={activeRisk.severity} />
                <span className="text-xs font-mono text-white/60">
                  {activeRisk.location ? decodeEntities(activeRisk.location) : categoryMeta(categorize(activeRisk)).short}
                </span>
                {activeRisk.created_at && (
                  <span className="flex items-center gap-1 text-[11px] text-white/40 font-mono">
                    <Clock className="h-3 w-3" />
                    {relativeTime(activeRisk.created_at)}
                  </span>
                )}
              </div>

              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Risk signals">
                {risks.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => snapToCard(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === activeIndex
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    )}
                    aria-label={`Jump to risk ${i + 1}`}
                    aria-selected={i === activeIndex}
                    role="tab"
                  />
                ))}
              </div>
            </div>

            {/* Active Title */}
            <div>
              <h3 className="text-base sm:text-lg font-medium text-white leading-snug">
                {decodeEntities(activeRisk.title)}
              </h3>
            </div>

            {/* Impact guidance callout */}
            {activeRisk.impact && (
              <div className="rounded-2xl liquid-glass px-4 py-3">
                <p className="text-xs leading-relaxed text-white/80">
                  <strong className="text-white font-medium">Impact Guidance: </strong>
                  {decodeEntities(activeRisk.impact)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/explore?highlight=${activeRisk.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 shadow-sm"
                >
                  <span>Investigate on Radar</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href={`/impact-copilot?disruptionId=${activeRisk.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl liquid-glass px-3.5 py-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Network className="h-3.5 w-3.5 text-white/60" />
                  <span>Plan Response</span>
                </Link>

                <Link
                  href={`/chat?query=${encodeURIComponent(
                    `Analyze supply chain risk: ${activeRisk.title}. How does this impact component lead times and what are alternative suppliers?`
                  )}`}
                  className="inline-flex items-center gap-1.5 rounded-xl liquid-glass px-3.5 py-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-white/60" />
                  <span>Analyze with AI</span>
                </Link>
              </div>

              {/* Bookmark & External Link */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(activeRisk)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors',
                    isSaved(activeRisk.id)
                      ? 'bg-white/20 border border-white/30 text-white'
                      : 'liquid-glass text-white/70 hover:text-white'
                  )}
                >
                  <Bookmark className={cn('h-3.5 w-3.5', isSaved(activeRisk.id) && 'fill-current')} />
                  <span>{isSaved(activeRisk.id) ? 'Saved' : 'Save Signal'}</span>
                </button>

                {activeRisk.source_url && (
                  <a
                    href={activeRisk.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-8 w-8 place-items-center rounded-xl liquid-glass text-white/60 hover:text-white transition-colors"
                    aria-label="View original article source"
                    title="Original Source"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen-reader Live Status Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {activeRisk
          ? `Showing risk ${activeIndex + 1} of ${count}: ${severityOf(activeRisk.severity)} severity. ${decodeEntities(
              activeRisk.title
            )}`
          : ''}
      </div>
    </div>
  );
}

function CardImageSection({
  item,
  bucket,
  CategoryIcon,
}: {
  item: Disruption;
  bucket: CategoryKey;
  CategoryIcon: React.ComponentType<{ className?: string }>;
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.image_url;

  if (!imageUrl || imgError) {
    return (
      <div className="relative h-24 w-full bg-black/40 flex items-center justify-center border-b border-white/[0.08] overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-1.5 text-white/50">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/5">
            <CategoryIcon className="h-4 w-4 text-white/70" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
            {categoryMeta(bucket).short}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-24 w-full bg-black/50 border-b border-white/[0.08] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- RSS feeds provide external image URLs */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        className="h-full w-full object-cover filter grayscale contrast-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
    </div>
  );
}
