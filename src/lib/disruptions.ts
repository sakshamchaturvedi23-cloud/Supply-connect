import { supabase } from '@/lib/supabaseClient';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Disruption = {
  id: string;
  title: string;
  category?: string | null;
  severity?: string | null;
  location?: string | null;
  description?: string | null;
  impact?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

export type SeverityKey = 'critical' | 'high' | 'medium' | 'low';

export type CategoryKey =
  | 'AI Chips & Core Tech Hardware'
  | 'Price Spikes & Raw Material Inflation'
  | 'Corporate Policy & Supply Shifts'
  | 'Logistics & Freight Volatility';

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=70`;

export const CATEGORIES: { key: CategoryKey; short: string; keywords: string[]; image: string }[] = [
  {
    key: 'AI Chips & Core Tech Hardware',
    short: 'Chips & hardware',
    keywords: ['ai chip', 'hardware', 'chip', 'semiconductor', 'nvidia', 'processor', 'gpu', 'wafer', 'tech'],
    image: img('photo-1518770660439-4636190af475'),
  },
  {
    key: 'Price Spikes & Raw Material Inflation',
    short: 'Prices & inflation',
    keywords: ['price', 'inflation', 'stock', 'market', 'cost', 'spike', 'commodity', 'raw material'],
    image: img('photo-1611974789855-9c2a0a7236a3'),
  },
  {
    key: 'Corporate Policy & Supply Shifts',
    short: 'Policy & corporate',
    keywords: ['corporate', 'policy', 'decision', 'merger', 'acquisition', 'plant', 'tariff', 'sanction', 'shift'],
    image: img('photo-1486406146926-c627a92ad1ab'),
  },
  {
    key: 'Logistics & Freight Volatility',
    short: 'Logistics & freight',
    keywords: ['port', 'ship', 'cargo', 'freight', 'logistic', 'transit', 'weather', 'typhoon', 'canal', 'container'],
    image: img('photo-1586528116311-ad8dd3c8310d'),
  },
];

export const FALLBACK_IMAGE = img('photo-1578575437130-527eed3abbec');
export const PER_CATEGORY = 12;

/** Category field wins; title keywords are the fallback. Handles both ingest naming schemes. */
export function categorize(d: Disruption): CategoryKey {
  const cat = (d.category ?? '').toLowerCase();
  const title = (d.title ?? '').toLowerCase();
  const byCat = CATEGORIES.find((c) => c.keywords.some((k) => cat.includes(k)));
  if (byCat) return byCat.key;
  const byTitle = CATEGORIES.find((c) => c.keywords.some((k) => title.includes(k)));
  return byTitle?.key ?? 'Logistics & Freight Volatility';
}

export const categoryMeta = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)!;

export function imageFor(d: Disruption, bucket = categorize(d)): string {
  return d.image_url || categoryMeta(bucket).image || FALLBACK_IMAGE;
}

/* ------------------------------------------------------------------ */
/* Severity                                                            */
/* ------------------------------------------------------------------ */

export const SEVERITY_ORDER: SeverityKey[] = ['critical', 'high', 'medium', 'low'];
export const SEVERITY_RANK: Record<SeverityKey, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export function severityOf(value?: string | null): SeverityKey {
  const s = (value ?? '').toLowerCase();
  return (SEVERITY_ORDER as string[]).includes(s) ? (s as SeverityKey) : 'medium';
}

export const SEVERITY_LABEL: Record<SeverityKey, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Highest severity first, then newest. */
export function bySeverityThenDate(a: Disruption, b: Disruption) {
  return (
    SEVERITY_RANK[severityOf(b.severity)] - SEVERITY_RANK[severityOf(a.severity)] ||
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  );
}

/* ------------------------------------------------------------------ */
/* Data access                                                         */
/* ------------------------------------------------------------------ */

export async function fetchDisruptions(limit = 300): Promise<Disruption[]> {
  const { data, error } = await supabase
    .from('disruptions')
    .select('id,title,category,severity,location,description,impact,image_url,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Disruption[];
}

export async function fetchDisruption(id: string): Promise<Disruption | null> {
  const { data, error } = await supabase.from('disruptions').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Disruption) ?? null;
}

/** Removes duplicate ids / titles that repeated ingests can create. */
export function dedupe(list: Disruption[]): Disruption[] {
  const ids = new Set<string>();
  const titles = new Set<string>();
  return list.filter((d) => {
    if (!d?.id || !d?.title) return false;
    const t = d.title.trim().toLowerCase();
    if (ids.has(d.id) || titles.has(t)) return false;
    ids.add(d.id);
    titles.add(t);
    return true;
  });
}
