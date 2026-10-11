'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny typed localStorage store.
 * Components subscribe through useSyncExternalStore, so a write anywhere
 * (this tab or another) updates every reader instantly — no polling.
 */

export const STORAGE_KEYS = {
  savedSignals: 'supply_connect_bookmarks',
  advisorChats: 'supply_connect_chats',
  lastSync: 'supply_connect_last_sync',
} as const;

const CHANGE_EVENT = 'sc:storage';
const cache = new Map<string, { raw: string | null; value: unknown }>();

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    cache.set(key, { raw, value });
    return value;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[storage] could not write ${key}`, e);
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** `fallback` must be a stable (module-level) value. */
export function useStoredValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => readJSON(key, fallback),
    () => fallback,
  );
}
