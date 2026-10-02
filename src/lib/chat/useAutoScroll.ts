'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Keeps a scroll container pinned to the bottom while the user is near it. Pass a falsy dep to pause. */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  const stick = useRef(true);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const pin = useCallback(() => {
    stick.current = true;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (dep && el && stick.current) el.scrollTop = el.scrollHeight;
  }, [dep]);

  return { ref, onScroll, pin };
}
