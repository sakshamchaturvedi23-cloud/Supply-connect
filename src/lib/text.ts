/** Decode the HTML entities that RSS feeds leave in titles (&apos;, &amp; …). */
export function decodeEntities(input?: string | null): string {
  return (input ?? '')
    .replace(/&apos;|&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Ingest stores impact as "Stocking Action: … | Startup Opportunity: …".
 * Split it into labelled parts; plain text comes back as one unlabeled part.
 */
export function parseImpact(impact?: string | null): { label?: string; text: string }[] {
  const raw = decodeEntities(impact).trim();
  if (!raw) return [];
  return raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^([A-Za-z][A-Za-z\s]{2,30}):\s*(.+)$/);
      return m ? { label: m[1].trim(), text: m[2].trim() } : { text: part };
    });
}

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function relativeTime(ts: number | string | Date): string {
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (!Number.isFinite(ms)) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
