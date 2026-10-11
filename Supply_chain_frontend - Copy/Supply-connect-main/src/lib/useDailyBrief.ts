'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Disruption, bySeverityThenDate, severityOf } from '@/lib/disruptions';
import { BriefSignal, DailyBrief, briefKey } from '@/lib/brief';
import { readJSON, writeJSON } from '@/lib/storage';

const CACHE_KEY = 'supply_connect_daily_brief';
const MAX_SIGNALS = 12;

type Cached = { key: string; brief: DailyBrief };

/** Urgent signals first; if nothing is urgent, the latest few. */
function pickSignals(all: Disruption[]): BriefSignal[] {
  const sorted = [...all].sort(bySeverityThenDate);
  const urgent = sorted.filter((d) => ['critical', 'high'].includes(severityOf(d.severity)));
  return (urgent.length ? urgent : sorted.slice(0, 8)).slice(0, MAX_SIGNALS).map((d) => ({
    id: String(d.id),
    title: d.title,
    severity: d.severity,
    category: d.category,
    location: d.location,
    impact: d.impact,
  }));
}

const noopSubscribe = () => () => {};
const localDay = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's timezone

async function requestBrief(day: string, signals: BriefSignal[], force: boolean): Promise<DailyBrief> {
  const res = await fetch('/api/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, signals, force }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data.brief) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data.brief as DailyBrief;
}

/**
 * Today's AI brief for a set of disruptions.
 * One request per day per signal set: cached in localStorage and on the server.
 */
export function useDailyBrief(data: Disruption[], ready: boolean) {
  const day = useSyncExternalStore(noopSubscribe, localDay, () => '');
  const signals = useMemo(() => (ready ? pickSignals(data) : []), [data, ready]);
  const key = day && signals.length ? briefKey(day, signals) : '';

  const [fetched, setFetched] = useState<Cached | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const inflight = useRef<string | null>(null);

  // Stored brief for today's key (read-only, safe during render — the key only exists client-side).
  const stored = useMemo(() => {
    if (!key) return null;
    const c = readJSON<Cached | null>(CACHE_KEY, null);
    return c?.key === key ? c.brief : null;
  }, [key]);

  const brief = fetched?.key === key ? fetched.brief : stored;

  /** Network + cache only; callers update state from the returned promise. */
  const fetchBrief = useCallback(
    async (force: boolean): Promise<Cached | null> => {
      if (!key || inflight.current === key) return null;
      inflight.current = key;
      try {
        const b = await requestBrief(day, signals, force);
        const entry: Cached = { key, brief: b };
        writeJSON(CACHE_KEY, entry);
        return entry;
      } finally {
        inflight.current = null;
      }
    },
    [day, key, signals],
  );

  useEffect(() => {
    if (!key || brief || failedKey === key) return;
    fetchBrief(false)
      .then((entry) => entry && setFetched(entry))
      .catch((e) => {
        console.error('Daily brief failed', e);
        setFailedKey(key);
      });
  }, [key, brief, failedKey, fetchBrief]);

  const regenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const entry = await fetchBrief(true);
      if (entry) setFetched(entry);
    } catch (e) {
      console.error('Daily brief failed', e);
    } finally {
      setRegenerating(false);
    }
  }, [fetchBrief]);

  const retry = useCallback(() => {
    setFailedKey(null);
  }, []);

  const status: 'idle' | 'loading' | 'ready' | 'error' = !key
    ? 'idle'
    : brief
      ? 'ready'
      : failedKey === key
        ? 'error'
        : 'loading';

  const sources = useMemo(() => {
    const byId = new Map(signals.map((s) => [s.id, s]));
    return (brief?.signalIds ?? []).map((id) => byId.get(id)).filter((s): s is BriefSignal => Boolean(s));
  }, [brief, signals]);

  return { brief, status, sources, signalCount: signals.length, regenerate, regenerating, retry };
}
