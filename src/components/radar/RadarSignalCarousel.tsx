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
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Crosshair,
  ExternalLink,
  Globe2,
  Layers,
  MapPin,
  Pause,
  Play,
  RotateCw,
  Ship,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CategoryKey,
  Disruption,
  articleLink,
  categorize,
  categoryMeta,
  severityOf,
} from '@/lib/disruptions';
import { resolveLocation } from '@/lib/locationMapping';
import { decodeEntities, parseImpact, relativeTime } from '@/lib/text';
import { SeverityBadge } from '@/components/ui/Badge';
import { ButtonLink, IconButton, buttonClass } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

export interface RadarSignalCarouselProps {
  items: (Disruption & { bucket: CategoryKey })[];
  selectedId: string | null;
  onSelectSignal: (item: Disruption & { bucket: CategoryKey }) => void;
  onClose: () => void;
  isSaved: (id: string) => boolean;
  onToggleSave: (item: Disruption) => void;
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

export function RadarSignalCarousel({
  items,
  selectedId,
  onSelectSignal,
  onClose,
  isSaved,
  onToggleSave,
  className,
}: RadarSignalCarouselProps) {
  const carouselId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // We operate on the provided signal items (limit to 12 for optimal cylindrical ergonomics)
  const displayItems = useMemo(() => {
    if (items.length <= 12) return items;
    // If selected item is present, center the 12-item slice around it
    if (selectedId) {
      const selIdx = items.findIndex((i) => i.id === selectedId);
      if (selIdx !== -1) {
        const half = 6;
        let start = Math.max(0, selIdx - half);
        let end = start + 12;
        if (end > items.length) {
          end = items.length;
          start = Math.max(0, end - 12);
        }
        return items.slice(start, end);
      }
    }
    return items.slice(0, 12);
  }, [items, selectedId]);

  const count = displayItems.length;
  const angleStep = count > 0 ? 360 / count : 60;

  // Responsive dimensions for 3D stage inside the right-hand panel (~360px-420px width)
  const [dimensions, setDimensions] = useState({
    width: 380,
    cardWidth: 260,
    cardHeight: 330,
    radius: 240,
    perspective: 900,
  });

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w < 360) {
        setDimensions({
          width: w,
          cardWidth: Math.max(220, w - 48),
          cardHeight: 300,
          radius: 170,
          perspective: 750,
        });
      } else if (w < 440) {
        setDimensions({
          width: w,
          cardWidth: 250,
          cardHeight: 320,
          radius: 210,
          perspective: 850,
        });
      } else {
        setDimensions({
          width: w,
          cardWidth: 270,
          cardHeight: 330,
          radius: 250,
          perspective: 950,
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
  const [viewMode, setViewMode] = useState<'3d' | 'flat'>('3d');

  // Pointer drag tracking
  const dragStartRef = useRef({ x: 0, y: 0, angle: 0, time: 0 });
  const lastDragRef = useRef({ x: 0, time: 0 });
  const velocityRef = useRef(0);
  const momentumRafRef = useRef<number | null>(null);
  const autoRotateRafRef = useRef<number | null>(null);

  // External store listeners
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot
  );

  // Pause when off-screen
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

  const activeItem = displayItems[activeIndex] ?? displayItems[0];

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

  // Synchronize carousel position when selectedId is updated externally (e.g. from Map marker click)
  const isInternalSelectionRef = useRef(false);
  useEffect(() => {
    if (!selectedId || count === 0) return;
    const targetIdx = displayItems.findIndex((i) => i.id === selectedId);
    if (targetIdx !== -1 && targetIdx !== activeIndex) {
      if (!isInternalSelectionRef.current) {
        snapToCard(targetIdx);
      }
    }
    isInternalSelectionRef.current = false;
  }, [selectedId, displayItems, count, snapToCard, activeIndex]);

  // Notify parent of active signal change when activeIndex changes through carousel interaction
  const lastActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeItem) return;
    if (lastActiveIdRef.current !== activeItem.id) {
      lastActiveIdRef.current = activeItem.id;
      if (selectedId !== activeItem.id) {
        isInternalSelectionRef.current = true;
        onSelectSignal(activeItem);
      }
    }
  }, [activeItem, onSelectSignal, selectedId]);

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
  }, [count, isPaused, isHovered, isFocused, isDragging, prefersReducedMotion, isInViewport, tabVisible]);

  // Pointer drag gestures
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    if (momentumRafRef.current) cancelAnimationFrame(momentumRafRef.current);
    if (autoRotateRafRef.current) cancelAnimationFrame(autoRotateRafRef.current);

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      angle: rotationAngle,
      time: performance.now(),
    };
    lastDragRef.current = {
      x: e.clientX,
      time: performance.now(),
    };
    velocityRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || count <= 1) return;

    const currentX = e.clientX;
    const now = performance.now();
    const deltaX = currentX - dragStartRef.current.x;

    const dt = now - lastDragRef.current.time;
    if (dt > 8) {
      const dx = currentX - lastDragRef.current.x;
      velocityRef.current = dx / dt;
      lastDragRef.current = { x: currentX, time: now };
    }

    const anglePerPixel = 360 / (dimensions.radius * 2 * Math.PI);
    const newAngle = dragStartRef.current.angle + deltaX * anglePerPixel * 0.9;
    setRotationAngle(newAngle);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }
    setIsDragging(false);

    if (count <= 1) return;

    // Apply inertia or snap to nearest card
    const v = velocityRef.current;
    if (Math.abs(v) > 0.35 && !prefersReducedMotion) {
      const initialVelocity = v * 12;
      const startTime = performance.now();
      const startAngle = rotationAngle;

      const friction = 0.0035;
      const duration = Math.min(650, Math.abs(initialVelocity) / friction);

      const momentumStep = (now: number) => {
        const elapsed = now - startTime;
        if (elapsed >= duration) {
          let closestIndex = 0;
          let minOffset = 9999;
          for (let i = 0; i < count; i++) {
            const offset = Math.abs(getCardOffset(i, rotationAngle));
            if (offset < minOffset) {
              minOffset = offset;
              closestIndex = i;
            }
          }
          snapToCard(closestIndex);
          return;
        }

        const t = elapsed / duration;
        const progress = 1 - Math.pow(1 - t, 2.5);
        const distance = initialVelocity * duration * progress * 0.025;
        setRotationAngle(startAngle + distance);

        momentumRafRef.current = requestAnimationFrame(momentumStep);
      };

      momentumRafRef.current = requestAnimationFrame(momentumStep);
    } else {
      snapToCard(activeIndex);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsPaused((p) => !p);
    }
  };

  if (count === 0 || !activeItem) {
    return (
      <div
        className={cn(
          'flex flex-col h-[720px] rounded-2xl liquid-glass-strong p-6 items-center justify-center text-center shadow-xl border border-white/10',
          className
        )}
      >
        <Sparkles className="h-8 w-8 text-white/40 mb-3" />
        <p className="text-sm font-medium text-white">No active signals to display</p>
        <p className="text-xs text-white/60 mt-1 max-w-xs">
          Select a signal on the map or adjust your search filters to launch the Radar Carousel.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-xl liquid-glass px-4 py-2 text-xs font-medium text-white/80 hover:text-white"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  const resolvedLoc = resolveLocation(activeItem.location);
  const action = parseImpact(activeItem.impact)[0];
  const article = articleLink(activeItem);
  const saved = isSaved(activeItem.id);

  return (
    <aside
      ref={containerRef}
      id={carouselId}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label="Disruption Radar 3D Signal Carousel"
      className={cn(
        'flex flex-col h-[720px] rounded-3xl bg-[#0a0d14]/50 backdrop-blur-md border border-white/[0.07] overflow-hidden shadow-2xl select-none outline-none focus-visible:ring-1 focus-visible:ring-white/30',
        className
      )}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.05] text-[11px] font-mono font-medium text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span>ORBIT {activeIndex + 1}/{count}</span>
          </div>
          <span className="text-[12px] text-white/60 hidden sm:inline">
            {categoryMeta(activeItem.bucket).short}
          </span>
        </div>

        {/* Carousel Micro Controls */}
        <div className="flex items-center gap-1">
          <IconButton
            type="button"
            onClick={() => setViewMode((m) => (m === '3d' ? 'flat' : '3d'))}
            aria-label={viewMode === '3d' ? 'Switch to swipeable cards' : 'Switch to 3D Orbit carousel'}
            title={viewMode === '3d' ? 'Switch to card list' : 'Switch to 3D Orbit'}
            className="h-7 w-7 text-white/60 hover:text-white"
          >
            {viewMode === '3d' ? <Layers className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            title={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
            className="h-7 w-7 text-white/60 hover:text-white"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton
            type="button"
            onClick={stepPrev}
            aria-label="Previous signal (Left Arrow)"
            title="Previous (Left Arrow)"
            className="h-7 w-7 text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <IconButton
            type="button"
            onClick={stepNext}
            aria-label="Next signal (Right Arrow)"
            title="Next (Right Arrow)"
            className="h-7 w-7 text-white/60 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <IconButton
            type="button"
            onClick={() => onToggleSave(activeItem)}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark signal'}
            aria-pressed={saved}
            className={cn('h-7 w-7 text-white/60 hover:text-white', saved && 'text-white')}
          >
            <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current')} />
          </IconButton>
          <IconButton
            type="button"
            onClick={onClose}
            aria-label="Close dossier panel"
            className="h-7 w-7 text-white/60 hover:text-white ml-0.5"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {/* Main Visual Carousel Stage: 3D Ring or Swipeable Track */}
      {viewMode === '3d' ? (
        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex items-center justify-center overflow-hidden h-[360px] cursor-grab active:cursor-grabbing border-b border-white/[0.06]"
          style={{
            perspective: `${dimensions.perspective}px`,
            perspectiveOrigin: '50% 50%',
          }}
        >
          {/* Subtle Ambient Depth Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-15"
          >
            <div className="h-44 w-44 rounded-full bg-white/20 blur-3xl" />
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
            {displayItems.map((item, idx) => {
              const offset = getCardOffset(idx, rotationAngle);
              const absOffset = Math.abs(offset);
              const isActive = idx === activeIndex;
              const baseAngle = idx * angleStep;
              const CategoryIcon = CATEGORY_ICON[item.bucket] || Globe2;

              let opacity = 1;
              let zIndex = 20;
              let filter = 'none';

              if (absOffset > 75) {
                opacity = 0.25;
                zIndex = 5;
                filter = 'brightness(0.55)';
              } else if (absOffset > 25) {
                opacity = 0.7;
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
                    'rounded-xl text-left flex flex-col overflow-hidden',
                    isActive
                      ? 'liquid-glass-strong border border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.08)] ring-1 ring-white/30'
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
                  {/* Card Top Metadata Bar */}
                  <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-3 py-2">
                    <SeverityBadge value={item.severity} />
                    <span className="text-[10px] font-mono text-white/60">
                      {item.created_at ? relativeTime(new Date(item.created_at).getTime()) : 'Active'}
                    </span>
                  </div>

                  {/* Card Image / Grayscale Fallback Section */}
                  <CardImageFallback item={item} CategoryIcon={CategoryIcon} />

                  {/* Card Body */}
                  <div className="flex-1 p-3.5 flex flex-col justify-between overflow-hidden">
                    <div>
                      <h3 className="text-[13px] font-medium leading-snug text-white line-clamp-2">
                        {decodeEntities(item.title)}
                      </h3>

                      {item.location && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-white/60 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-white/40" />
                          <span>{decodeEntities(item.location)}</span>
                        </p>
                      )}
                    </div>

                    {item.impact && (
                      <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2 text-[11px] leading-relaxed text-white/70 line-clamp-2">
                        {decodeEntities(item.impact)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Mobile / Flat Swipeable Horizontal Card Track */
        <div className="relative flex items-center overflow-x-auto snap-x snap-mandatory gap-3 p-4 h-[360px] border-b border-white/[0.06]">
          {displayItems.map((item, idx) => {
            const isActive = idx === activeIndex;
            const CategoryIcon = CATEGORY_ICON[item.bucket] || Globe2;
            return (
              <div
                key={item.id}
                role="group"
                aria-roledescription="slide"
                onClick={() => {
                  if (!isActive) snapToCard(idx);
                }}
                className={cn(
                  'flex-shrink-0 snap-center rounded-xl overflow-hidden flex flex-col transition-all cursor-pointer text-left',
                  'w-[250px] h-[320px]',
                  isActive
                    ? 'liquid-glass-strong border border-white/40 shadow-xl ring-1 ring-white/30'
                    : 'liquid-glass opacity-70 hover:opacity-100'
                )}
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-3 py-2">
                  <SeverityBadge value={item.severity} />
                  <span className="text-[10px] font-mono text-white/60">
                    {item.created_at ? relativeTime(new Date(item.created_at).getTime()) : 'Active'}
                  </span>
                </div>
                <CardImageFallback item={item} CategoryIcon={CategoryIcon} />
                <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="text-[13px] font-medium leading-snug text-white line-clamp-2">
                      {decodeEntities(item.title)}
                    </h3>
                    {item.location && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-white/60 truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-white/40" />
                        <span>{decodeEntities(item.location)}</span>
                      </p>
                    )}
                  </div>
                  {item.impact && (
                    <div className="mt-2 rounded-lg bg-white/[0.04] border border-white/[0.06] p-2 text-[11px] leading-relaxed text-white/70 line-clamp-2">
                      {decodeEntities(item.impact)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Position Indicator Dots */}
      <div className="flex items-center justify-center gap-1.5 py-2 border-b border-white/[0.06] bg-black/20" role="tablist" aria-label="Signal positions">
        {displayItems.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => snapToCard(idx)}
            aria-label={`Jump to signal ${idx + 1}`}
            aria-selected={idx === activeIndex}
            role="tab"
            className={cn(
              'h-1.5 rounded-full transition-all duration-200',
              idx === activeIndex ? 'w-5 bg-white shadow-sm' : 'w-1.5 bg-white/25 hover:bg-white/50'
            )}
          />
        ))}
      </div>

      {/* Selected Signal Detail Dossier & Actions (Scrollable bottom section) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Active Title & Honesty Location Card */}
        <div>
          <h2 className="text-[15px] font-medium leading-snug text-white">
            {decodeEntities(activeItem.title)}
          </h2>

          <div className="mt-2 rounded-xl liquid-glass p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
              <MapPin className="h-3 w-3 text-white/60 shrink-0" />
              <span>Location: {decodeEntities(activeItem.location || 'Unspecified')}</span>
            </div>
            {resolvedLoc.mapped ? (
              <p className="text-[11px] text-white/60 flex items-center gap-1">
                <Crosshair className="h-2.5 w-2.5 text-white/50" />
                {resolvedLoc.precisionLabel} ({resolvedLoc.normalizedName})
              </p>
            ) : (
              <p className="text-[11px] text-white/50">
                🌐 Unmapped: Positioned in general radar feed without guessed coordinates.
              </p>
            )}
          </div>
        </div>

        {/* AI Assessment / Impact Callout */}
        {action && (
          <div className="rounded-xl liquid-glass p-3 border border-white/10">
            <h4 className="flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wider text-white/70">
              <Sparkles className="h-3 w-3 text-white/80" />
              {action.label || 'Recommended Action'}
            </h4>
            <p className="mt-1 text-[12px] leading-relaxed text-white/80">
              {action.text}
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="border-t border-white/10 p-4 space-y-2 bg-black/40">
        <ButtonLink
          href={`/startup-advisor?id=${activeItem.id}`}
          variant="primary"
          size="sm"
          className="w-full justify-center font-medium shadow-md"
        >
          Plan a response with Advisor
        </ButtonLink>

        <a
          href={article.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonClass('secondary', 'sm'),
            'w-full justify-center gap-1.5 liquid-glass text-white/80 hover:text-white text-xs'
          )}
        >
          {article.isSource ? 'Read original news article' : 'Search headline coverage'}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Screen-reader Live Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing signal {activeIndex + 1} of {count}: {severityOf(activeItem.severity)} severity. {decodeEntities(activeItem.title)}
      </div>
    </aside>
  );
}

function CardImageFallback({
  item,
  CategoryIcon,
}: {
  item: Disruption;
  CategoryIcon: React.ComponentType<{ className?: string }>;
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.image_url;

  if (!imageUrl || imgError) {
    return (
      <div className="relative h-24 w-full bg-black/50 flex items-center justify-center border-b border-white/[0.08] overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-1 text-white/50">
          <div className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/5">
            <CategoryIcon className="h-3.5 w-3.5 text-white/70" />
          </div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">
            {categoryMeta(categorize(item)).short}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-24 w-full bg-black/60 border-b border-white/[0.08] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
