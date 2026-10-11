'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  MotionValue,
} from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';

export interface DeckCarouselProps<T = unknown> {
  items: T[];
  renderCard?: (item: T, index: number, isCenter: boolean) => React.ReactNode;
  children?: (item: T, index: number, isCenter: boolean) => React.ReactNode;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  gap?: number;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  emptyState?: React.ReactNode;
}

interface DeckCardProps<T> {
  item: T;
  index: number;
  smoothIndex: MotionValue<number>;
  dealMotion: MotionValue<number>;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  gap: number;
  isCenter: boolean;
  onClick: () => void;
  renderCard?: (item: T, index: number, isCenter: boolean) => React.ReactNode;
}

function DeckCard<T>({
  item,
  index,
  smoothIndex,
  dealMotion,
  cardWidth,
  cardHeight,
  cardRadius,
  gap,
  isCenter,
  onClick,
  renderCard,
}: DeckCardProps<T>) {
  // Compute distance from active center index
  const offset = useTransform(smoothIndex, (curr: number) => index - curr);

  // 3D positioning transformations
  const x = useTransform<number, number>([offset, dealMotion], (latest) => {
    const off = latest[0] ?? 0;
    const deal = latest[1] ?? 1;
    const targetX = off * gap;
    return targetX * deal;
  });

  const z = useTransform<number, number>([offset, dealMotion], (latest) => {
    const off = latest[0] ?? 0;
    const deal = latest[1] ?? 1;
    const absOff = Math.abs(off);
    const targetZ = -Math.min(absOff * 140, 500);
    return targetZ * deal;
  });

  const rotateY = useTransform<number, number>([offset, dealMotion], (latest) => {
    const off = latest[0] ?? 0;
    const deal = latest[1] ?? 1;
    const clampedOff = Math.max(-3, Math.min(3, off));
    const targetRotateY = -clampedOff * 14;
    return targetRotateY * deal;
  });

  const rotateZ = useTransform<number, number>([offset, dealMotion], (latest) => {
    const off = latest[0] ?? 0;
    const deal = latest[1] ?? 1;
    const clampedOff = Math.max(-3, Math.min(3, off));
    // Subtle card fan tilt
    const targetRotateZ = clampedOff * 2.2;
    return targetRotateZ * deal;
  });

  const scale = useTransform(offset, (off: number) => {
    const absOff = Math.abs(off);
    return Math.max(0.72, 1 - absOff * 0.11);
  });

  const opacity = useTransform(offset, (off: number) => {
    const absOff = Math.abs(off);
    if (absOff > 3.5) return 0;
    return Math.max(0.15, 1 - absOff * 0.28);
  });

  const zIndex = useTransform(offset, (off: number) => {
    return Math.round(100 - Math.abs(off) * 15);
  });

  return (
    <motion.div
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: cardRadius,
        x,
        z,
        rotateY,
        rotateZ,
        scale,
        opacity,
        zIndex,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none transition-shadow duration-300',
        isCenter ? 'ring-1 ring-white/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)]' : 'hover:brightness-110'
      )}
    >
      {renderCard ? (
        renderCard(item, index, isCenter)
      ) : (
        <div
          style={{ borderRadius: cardRadius }}
          className="h-full w-full bg-[#0a0d18]/90 backdrop-blur-xl border border-white/10 p-5 text-white flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Card {index + 1}</span>
            {isCenter && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white">Item {index + 1}</h4>
            <p className="mt-1 text-xs text-slate-400 line-clamp-3">Deck carousel card content.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function DeckCarousel<T = unknown>({
  items,
  renderCard,
  children,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  cardWidth = 300,
  cardHeight = 400,
  cardRadius = 16,
  gap = 210,
  className,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  emptyState,
}: DeckCarouselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const total = items.length;

  const [internalIndex, setInternalIndex] = useState(0);
  const activeIdx = controlledIndex !== undefined ? controlledIndex : internalIndex;

  // Primary motion values
  const rawIndex = useMotionValue(activeIdx);
  const smoothIndex = useSpring(rawIndex, {
    stiffness: 240,
    damping: 26,
    mass: 0.5,
  });

  // Staggered deal intro animation: 0 -> 1
  const dealMotion = useMotionValue(0);

  useEffect(() => {
    // Staggered deal intro animation on mount
    const anim = animate(dealMotion, 1, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.15,
    });
    return () => anim.stop();
  }, [dealMotion]);

  // Sync internal/external index changes
  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== rawIndex.get()) {
      rawIndex.set(controlledIndex);
    }
  }, [controlledIndex, rawIndex]);

  // Listener to notify on settling/index change
  useEffect(() => {
    const unsubscribe = smoothIndex.on('change', (latest: number) => {
      const rounded = Math.round(latest);
      const clamped = Math.max(0, Math.min(total - 1, rounded));
      if (clamped !== internalIndex) {
        setInternalIndex(clamped);
        onActiveIndexChange?.(clamped);
      }
    });
    return () => unsubscribe();
  }, [smoothIndex, total, internalIndex, onActiveIndexChange]);

  const setIndex = useCallback(
    (newIndex: number) => {
      if (total === 0) return;
      const clamped = Math.max(0, Math.min(total - 1, newIndex));
      rawIndex.set(clamped);
      if (controlledIndex === undefined) {
        setInternalIndex(clamped);
      }
      onActiveIndexChange?.(clamped);
    },
    [total, rawIndex, controlledIndex, onActiveIndexChange]
  );

  const prev = useCallback(() => setIndex(activeIdx - 1), [setIndex, activeIdx]);
  const next = useCallback(() => setIndex(activeIdx + 1), [setIndex, activeIdx]);

  // Auto play
  useEffect(() => {
    if (!autoPlay || total <= 1) return;
    const interval = setInterval(() => {
      setIndex((activeIdx + 1) % total);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, activeIdx, total, setIndex]);

  // Pointer drag scrubbing
  const dragStartX = useRef(0);
  const dragStartIndex = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartIndex.current = rawIndex.get();
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - dragStartX.current;
    // Map horizontal pixel drag to index scrub
    const indexDelta = -deltaX / (gap * 0.85);
    const target = dragStartIndex.current + indexDelta;
    // Elastic bounds resistance
    if (target < 0) {
      rawIndex.set(target * 0.3);
    } else if (target > total - 1) {
      rawIndex.set(total - 1 + (target - (total - 1)) * 0.3);
    } else {
      rawIndex.set(target);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
    const current = rawIndex.get();
    const nearest = Math.max(0, Math.min(total - 1, Math.round(current)));
    setIndex(nearest);
  };

  // Mouse wheel scrubbing (with horizontal bias to avoid vertical page jump)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let wheelTimeout: NodeJS.Timeout;

    const handleWheel = (e: WheelEvent) => {
      // Detect horizontal or intentional wheel scrub
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const isShift = e.shiftKey;

      if (isHorizontal || isShift) {
        e.preventDefault();
        const delta = isHorizontal ? e.deltaX : e.deltaY;
        const indexDelta = delta / 240;
        const current = rawIndex.get();
        const nextVal = Math.max(-0.4, Math.min(total - 0.6, current + indexDelta));
        rawIndex.set(nextVal);

        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          const nearest = Math.max(0, Math.min(total - 1, Math.round(rawIndex.get())));
          setIndex(nearest);
        }, 120);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, [total, rawIndex, setIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  };

  if (total === 0) {
    return (
      <div className={cn('relative w-full py-16 flex items-center justify-center', className)}>
        {emptyState || (
          <div className="text-center p-8 rounded-2xl bg-[#0a0d14]/40 backdrop-blur-md border border-white/10 text-slate-400">
            No signals available in the deck.
          </div>
        )}
      </div>
    );
  }

  const cardRenderer = renderCard || children;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        'relative w-full select-none focus:outline-none overflow-visible',
        className
      )}
      style={{
        height: cardHeight + 80,
        perspective: '1200px',
        touchAction: 'pan-y',
      }}
      role="region"
      aria-label="3D Deck Carousel"
    >
      {/* 3D Scene Container */}
      <div
        className="relative w-full h-full flex items-center justify-center pointer-events-auto"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {items.map((item, idx) => (
          <DeckCard
            key={idx}
            item={item}
            index={idx}
            smoothIndex={smoothIndex}
            dealMotion={dealMotion}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardRadius={cardRadius}
            gap={gap}
            isCenter={idx === activeIdx}
            onClick={() => setIndex(idx)}
            renderCard={cardRenderer}
          />
        ))}
      </div>

      {/* Floating Translucent Controls */}
      {showControls && total > 1 && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
          <button
            type="button"
            onClick={prev}
            disabled={activeIdx <= 0}
            aria-label="Previous card"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Position indicator capsule */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300 shadow-md">
            <span>{activeIdx + 1}</span>
            <span className="text-white/30">/</span>
            <span className="text-slate-500">{total}</span>
          </div>

          <button
            type="button"
            onClick={next}
            disabled={activeIdx >= total - 1}
            aria-label="Next card"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
