'use client';

import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 140;

/**
 * Touch-only pull-to-refresh. Fires `onRefresh` at most once per gesture,
 * and never from mouse wheels or trackpads.
 * Returns the current pull distance (for an indicator).
 */
export function usePullToRefresh(onRefresh: () => void, enabled: boolean) {
  const [pull, setPull] = useState(0);
  const cb = useRef(onRefresh);
  useEffect(() => {
    cb.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    let startY: number | null = null;
    let distance = 0;

    const onStart = (e: TouchEvent) => {
      startY = window.scrollY <= 0 ? e.touches[0].clientY : null;
      distance = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      distance = Math.max(0, e.touches[0].clientY - startY);
      setPull(Math.min(distance, THRESHOLD * 1.3));
    };
    const onEnd = () => {
      if (startY !== null && distance >= THRESHOLD) cb.current();
      startY = null;
      distance = 0;
      setPull(0);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [enabled]);

  return pull;
}
