/** Shared between the /api/brief route and the client — keep this file dependency-free. */

/** The daily AI brief: three plain-language lines. */
export type DailyBrief = {
  changed: string;
  affected: string;
  action: string;
  signalIds: string[];
};

export type BriefSignal = {
  id: string;
  title: string;
  severity?: string | null;
  category?: string | null;
  location?: string | null;
  impact?: string | null;
};

/** One brief per day per set of signals. */
export function briefKey(day: string, signals: BriefSignal[]) {
  return `${day}|${signals.map((s) => s.id).sort().join(',')}`;
}
