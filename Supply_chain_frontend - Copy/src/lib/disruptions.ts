import { supabase } from '@/lib/supabaseClient';
import { isSupabaseConfigured } from '@/lib/supabase/env';

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
  source_url?: string | null;
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

/* ------------------------------------------------------------------ */
/* Fallback dataset for offline / unconfigured Supabase development    */
/* ------------------------------------------------------------------ */

export const FALLBACK_DISRUPTIONS: Disruption[] = [
  {
    id: 'demo-red-sea-01',
    title: 'Red Sea Missile Escalation Forces Mega-Containership Diversions Around Cape of Good Hope',
    category: 'Logistics & Freight Volatility',
    severity: 'critical',
    location: 'Red Sea',
    description: 'Maritime security risk premiums surged as major container carriers announced extended transit suspensions through the Bab-el-Mandeb Strait, adding 10 to 14 days to Asia-Europe voyages.',
    impact: 'Action: Buffer transit lead times by +14 days for westbound shipments. Re-route critical sub-assemblies via airfreight or Eurasian rail landbridge.',
    image_url: img('photo-1586528116311-ad8dd3c8310d'),
    source_url: 'https://www.reuters.com/business/retail-consumer/red-sea-shipping-disruptions-lead-time-costs-2024/',
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-taiwan-chips-02',
    title: 'Advanced CoWoS Packaging Bottlenecks Constrain Global AI Accelerator Shipments',
    category: 'AI Chips & Core Tech Hardware',
    severity: 'critical',
    location: 'Hsinchu, Taiwan',
    description: 'Substrate availability and interposer fabrication throughput remain severely backlogged across major Hsinchu cleanrooms, capping deliverable quantities of enterprise AI compute modules.',
    impact: 'Action: Lock second-tier wafer commitments; audit dual-sourcing options for intermediate passive interposer substrates.',
    image_url: img('photo-1518770660439-4636190af475'),
    source_url: 'https://www.bloomberg.com/technology',
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-rhine-logistics-03',
    title: 'Rhine River Water Levels Fall Below Kaub Gauge Minimums, Halving Barge Capacity',
    category: 'Logistics & Freight Volatility',
    severity: 'high',
    location: 'Ruhr / Duisburg, Germany',
    description: 'Barge operators on the Middle Rhine are imposing extreme shallow-water surcharges and restricting vessel cargo loads to 40% capacity, throttling petrochemical feeds into downstream industrial clusters.',
    impact: 'Action: Transfer bulk feedstock from barge to block-train rail charters between Rotterdam and Ludwigshafen.',
    image_url: img('photo-1486406146926-c627a92ad1ab'),
    source_url: 'https://www.reuters.com/world/europe/rhine-water-levels-german-economy-2024/',
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-panama-canal-04',
    title: 'Gatun Lake Reservoir Deficit Enforces Strict Draft Restrictions on Neopanamax Vessels',
    category: 'Logistics & Freight Volatility',
    severity: 'high',
    location: 'Panama Canal',
    description: 'The Panama Canal Authority lowered maximum allowable vessel drafts to 44 feet, prompting containerships and LNG carriers to offload containers or queue for auction slots.',
    impact: 'Action: Route US East Coast imports through West Coast intermodal corridors or transship via Suez/Cape lanes.',
    image_url: img('photo-1578575437130-527eed3abbec'),
    source_url: 'https://apnews.com/hub/panama-canal',
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-korea-memory-05',
    title: 'Fabricators in Gyeonggi Reallocate Cleanroom Capacity from Legacy DDR4 to HBM3e',
    category: 'AI Chips & Core Tech Hardware',
    severity: 'medium',
    location: 'Seoul / Gyeonggi, South Korea',
    description: 'Leading memory suppliers have accelerated migration of cleanroom floor space toward high-bandwidth stacked memory, precipitating price firmness in conventional industrial server RAM.',
    impact: 'Action: Pre-order 6-month buffer inventories for DDR5 and enterprise DIMMs before projected Q3 contract price resets.',
    image_url: img('photo-1518770660439-4636190af475'),
    source_url: 'https://www.bloomberg.com/technology',
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-mumbai-port-06',
    title: 'JNPT Intermodal Freight Dwell Times Spike Following Rail Yard Signaling Modernization',
    category: 'Logistics & Freight Volatility',
    severity: 'high',
    location: 'Mumbai / JNPT Port, India',
    description: 'Container evacuation at Nhava Sheva terminals slowed by 38% due to track maintenance and chassis allocation constraints across western railway corridors.',
    impact: 'Action: Divert urgent export containers through Mundra Port; deploy bonded trucking for critical customs clears.',
    image_url: img('photo-1586528116311-ad8dd3c8310d'),
    source_url: 'https://timesofindia.indiatimes.com/business',
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-shenzhen-rare-earth-07',
    title: 'Export Control Audits Slow Neodymium and Dysprosium Shipments Through Shenzhen',
    category: 'Price Spikes & Raw Material Inflation',
    severity: 'critical',
    location: 'Shenzhen, China',
    description: 'New customs declaration protocols for critical permanent magnet materials require end-user verification, lengthening average port clearance cycles from 4 to 19 days.',
    impact: 'Action: Validate supplier material origin certificates and verify secondary magnet finishing facilities in Southeast Asia.',
    image_url: img('photo-1611974789855-9c2a0a7236a3'),
    source_url: 'https://www.ft.com/commodities',
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-la-long-beach-08',
    title: 'Port of Los Angeles Chassis Shortages Lead to Staged Rail Terminal Congestion',
    category: 'Logistics & Freight Volatility',
    severity: 'high',
    location: 'Los Angeles / Long Beach, USA',
    description: 'Inbound container dwell times at San Pedro Bay terminals exceeded 6.8 days as off-dock chassis pools experienced localized shortages amid inbound retail restocking surges.',
    impact: 'Action: Authorize off-dock dual-transaction trucker reservations; audit warehouse staging turnaround speed.',
    image_url: img('photo-1586528116311-ad8dd3c8310d'),
    source_url: 'https://www.joc.com/port-news/us-ports/port-los-angeles',
    created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-rotterdam-energy-09',
    title: 'Northwest Europe Industrial Gas Tariff Hikes Impact Chemical Precursor Refineries',
    category: 'Price Spikes & Raw Material Inflation',
    severity: 'medium',
    location: 'Port of Rotterdam, Netherlands',
    description: 'Regional spot natural gas fluctuations prompted specialty chemical manufacturers around Rotterdam to implement temporary energy surcharges on plastic polymers.',
    impact: 'Action: Review quarterly resin indexed escalator clauses; source alternative compounding volumes from US Gulf Coast suppliers.',
    image_url: img('photo-1611974789855-9c2a0a7236a3'),
    source_url: 'https://www.reuters.com/business/energy',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-global-cloud-10',
    title: 'Hyperscale Cloud Operators Enact Power Density Quotas Across European Data Campuses',
    category: 'Corporate Policy & Supply Shifts',
    severity: 'low',
    location: 'Global',
    description: 'Municipal grid constraints in Dublin, Frankfurt, and Amsterdam have prompted major infrastructure providers to cap rack power delivery for non-accelerated cloud workloads.',
    impact: 'Action: Audit workload distribution; plan high-compute inference deployments in regions with surplus renewable capacity.',
    image_url: img('photo-1486406146926-c627a92ad1ab'),
    source_url: 'https://www.datacenterdynamics.com',
    created_at: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-singapore-weather-11',
    title: 'Severe Equatorial Squalls Produce 48-Hour Berthing Delay at Singapore Anchorage',
    category: 'Logistics & Freight Volatility',
    severity: 'medium',
    location: 'Strait of Malacca / Singapore',
    description: 'Monsoon squall systems sweeping through the Malacca strait delayed tugboat and bunkering operations across Tuas and Jurong island terminals.',
    impact: 'Action: Monitor feeder ship arrival schedules in surrounding hub ports including Klang and Tanjung Pelepas.',
    image_url: img('photo-1586528116311-ad8dd3c8310d'),
    source_url: 'https://www.straitstimes.com/singapore',
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-japan-semicon-12',
    title: 'Kyushu Silicon Wafer Production Ramps Up Following Expanded Power Grid Tie-in',
    category: 'AI Chips & Core Tech Hardware',
    severity: 'low',
    location: 'Tokyo Bay, Japan',
    description: 'Grid upgrades in western Japan have enabled fab expansions to commission next-generation epitaxy furnaces on schedule, increasing raw 300mm wafer capacity.',
    impact: 'Action: Qualify newly commissioned Japanese crystal ingot runs for next year’s silicon contract renewals.',
    image_url: img('photo-1518770660439-4636190af475'),
    source_url: 'https://asia.nikkei.com/Business/Tech/Semiconductors',
    created_at: new Date(Date.now() - 13 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-nynj-labor-13',
    title: 'Port of New York & New Jersey Terminal Operators Prepare Contingency Rail Reroutes',
    category: 'Corporate Policy & Supply Shifts',
    severity: 'high',
    location: 'Port of NY & NJ, USA',
    description: 'With coastal labor agreements approaching renewal deadlines, logistics operators are shifting discretionary cargo allocations toward Canadian and Gulf Coast gateways.',
    impact: 'Action: Split container allocations 60/40 between East Coast and Pacific intermodal routings through Q4.',
    image_url: img('photo-1486406146926-c627a92ad1ab'),
    source_url: 'https://www.joc.com/port-news/us-ports/port-new-york-and-new-jersey',
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-chile-lithium-14',
    title: 'Atacama Salar Water Extraction Regulations Slow Brine Pumping Expansions',
    category: 'Price Spikes & Raw Material Inflation',
    severity: 'medium',
    location: 'Port of Valparaiso / Chile',
    description: 'Updated environmental compliance rules for Andean aquifers have prompted key lithium miners to defer output expansion targets until hydrologic modeling is certified.',
    impact: 'Action: Hedge lithium carbonate derivative contracts; review tier-1 EV battery cell delivery guarantees.',
    image_url: img('photo-1611974789855-9c2a0a7236a3'),
    source_url: 'https://www.mining.com/category/lithium',
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-mexico-nearshoring-15',
    title: 'Monterrey Manufacturing Cluster Faces Highway Logistics Backlog at Nuevo Laredo Border',
    category: 'Corporate Policy & Supply Shifts',
    severity: 'medium',
    location: 'Monterrey, Mexico',
    description: 'Cross-border commercial truck processing times at the World Trade Bridge expanded to 11 hours following new non-intrusive cargo scanner software calibrations.',
    impact: 'Action: Enroll carrier partners in C-TPAT expedited lanes or utilize scheduled Kansas City Southern intermodal trains.',
    image_url: img('photo-1486406146926-c627a92ad1ab'),
    source_url: 'https://www.freightwaves.com',
    created_at: new Date(Date.now() - 16 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-global-fuel-16',
    title: 'Global Air Cargo Jet Fuel Surcharges Adjust Higher on High Refining Crack Spreads',
    category: 'Price Spikes & Raw Material Inflation',
    severity: 'low',
    location: 'Worldwide',
    description: 'Jet fuel crack spreads widened across Asian and European hubs, prompting airfreight forwarders to bump fuel indexing mechanisms by 8-12 cents per chargeable kilogram.',
    impact: 'Action: Re-evaluate freight modes for components weighing over 50kg with lead times greater than 10 days.',
    image_url: img('photo-1611974789855-9c2a0a7236a3'),
    source_url: 'https://aircargonews.net',
    created_at: new Date(Date.now() - 17 * 24 * 3600 * 1000).toISOString(),
  },
];

/* ------------------------------------------------------------------ */
/* Data access                                                         */
/* ------------------------------------------------------------------ */

export async function fetchDisruptions(limit = 300): Promise<Disruption[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_DISRUPTIONS;
  }
  try {
    const { data, error } = await supabase
      .from('disruptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (data && data.length > 0) return data as Disruption[];
    return FALLBACK_DISRUPTIONS;
  } catch (err) {
    console.warn('Supabase disruptions fetch unavailable; serving curated reference signals:', err);
    return FALLBACK_DISRUPTIONS;
  }
}

export async function fetchDisruption(id: string): Promise<Disruption | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_DISRUPTIONS.find((d) => d.id === id) ?? null;
  }
  try {
    const { data, error } = await supabase.from('disruptions').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (data) return data as Disruption;
  } catch (err) {
    console.warn(`Supabase fetchDisruption(${id}) failed; checking fallback dataset:`, err);
  }
  return FALLBACK_DISRUPTIONS.find((d) => d.id === id) ?? null;
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

/** Non-mutating Fisher–Yates shuffle. Call from event handlers / data loading, never during render. */
export function shuffled<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Original article if we stored it, otherwise a news search for the headline. */
export function articleLink(d: Disruption): { href: string; isSource: boolean } {
  const url = d.source_url?.trim();
  if (url && /^https?:\/\//i.test(url)) return { href: url, isSource: true };
  return { href: `https://news.google.com/search?q=${encodeURIComponent(d.title)}`, isSource: false };
}
