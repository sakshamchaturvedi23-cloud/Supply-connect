'use client';

import { useCallback, useEffect, useState } from 'react';
import { Disruption, dedupe, fetchDisruptions } from '@/lib/disruptions';
import { STORAGE_KEYS } from '@/lib/storage';

const AUTO_SYNC_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 60 * 1000;

/* Module-level cache: navigating between pages reuses data instantly. */
let cache: { data: Disruption[]; at: number } | null = null;
let inflightLoad: Promise<Disruption[]> | null = null;
let inflightSync: Promise<void> | null = null;

function load(force = false): Promise<Disruption[]> {
  if (!force && cache && Date.now() - cache.at < STALE_MS) return Promise.resolve(cache.data);
  if (!inflightLoad) {
    inflightLoad = fetchDisruptions()
      .then((rows) => {
        const data = dedupe(rows);
        cache = { data, at: Date.now() };
        return data;
      })
      .finally(() => {
        inflightLoad = null;
      });
  }
  return inflightLoad;
}

/** Calls the ingest API. Only one sync can run at a time across the whole app. */
function runSync(): Promise<void> {
  if (!inflightSync) {
    inflightSync = fetch('/api/ingest', { cache: 'no-store' })
      .then(() => {
        try {
          localStorage.setItem(STORAGE_KEYS.lastSync, String(Date.now()));
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        inflightSync = null;
      });
  }
  return inflightSync;
}

function syncIsDue() {
  try {
    const last = Number(localStorage.getItem(STORAGE_KEYS.lastSync) ?? 0);
    return !last || Date.now() - last > AUTO_SYNC_MS;
  } catch {
    return false;
  }
}

type Status = 'loading' | 'ready' | 'error';

export function useDisruptions({ autoSync = false }: { autoSync?: boolean } = {}) {
  const [data, setData] = useState<Disruption[]>(() => cache?.data ?? []);
  const [status, setStatus] = useState<Status>(() => (cache ? 'ready' : 'loading'));
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const reload = useCallback(async (force = false) => {
    try {
      setData(await load(force));
      setStatus('ready');
    } catch (e) {
      console.error('Could not load disruptions', e);
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await runSync();
    } catch (e) {
      console.error('Sync failed', e);
    }
    await reload(true);
    setLastSyncedAt(Date.now());
    setSyncing(false);
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await reload();
      if (!cancelled && autoSync && syncIsDue()) {
        setSyncing(true);
        try {
          await runSync();
          await reload(true);
        } catch (e) {
          console.error('Auto-sync failed', e);
        }
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoSync, reload]);

  return { data, status, syncing, sync, reload, lastSyncedAt };
}
