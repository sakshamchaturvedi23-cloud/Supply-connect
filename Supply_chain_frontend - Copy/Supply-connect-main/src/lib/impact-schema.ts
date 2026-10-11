// src/lib/impact-schema.ts
// Shared contract between the API route and the UI.
// The LLM must return THIS shape (JSON), never markdown.

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Priority = 'P0' | 'P1' | 'P2';
export type Trend = 'up' | 'down' | 'flat';
export type LevelKey = 'macro' | 'regional' | 'direct';

export interface ImpactNode {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
}

export interface ImpactLevel {
  title: string;
  summary: string;
  nodes: ImpactNode[];
}

export interface ImpactLink {
  from: string;
  to: string;
  label?: string;
}

export interface PlaybookAction {
  title: string;
  detail: string;
  priority: Priority;
  owner?: string;
}

export interface PlaybookPhase {
  phase: string;
  horizon: string;
  actions: PlaybookAction[];
}

export interface ImpactMetric {
  label: string;
  value: string;
  trend: Trend;
}

export interface ImpactAnalysis {
  headline: string;
  riskScore: number;
  exposure: string;
  levels: Record<LevelKey, ImpactLevel>;
  links: ImpactLink[];
  playbook: PlaybookPhase[];
  metrics: ImpactMetric[];
}

export const LEVEL_ORDER: LevelKey[] = ['macro', 'regional', 'direct'];

const PREFIX: Record<LevelKey, string> = { macro: 'm', regional: 'r', direct: 'd' };

const DEFAULT_TITLES: Record<LevelKey, string> = {
  macro: 'Macro Event / Global Shock',
  regional: 'Regional Ripple / Bottleneck',
  direct: 'Direct Impact on Your Work',
};

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const PRIORITIES = ['P0', 'P1', 'P2'] as const;
const TRENDS = ['up', 'down', 'flat'] as const;

const str = (v: unknown, fb = ''): string =>
  typeof v === 'string' && v.trim() ? stripMarkdown(v.trim()) : fb;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted model JSON, every field is validated below
type Loose = any;

const arr = (v: unknown): Loose[] => (Array.isArray(v) ? v : []);

const pick = <T extends string>(v: unknown, allowed: readonly T[], fb: T): T => {
  const s = String(v ?? '').trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === s) ?? fb;
};

// Kill any stray markdown the model still sneaks in.
const stripMarkdown = (s: string) =>
  s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[|#`]/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Pull the first JSON object out of raw model text (handles ```json fences). */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Coerce any model output into a safe, fully-populated ImpactAnalysis. */
export function normalizeAnalysis(raw: Loose): ImpactAnalysis {
  const usedIds = new Set<string>();
  const levels = {} as Record<LevelKey, ImpactLevel>;

  for (const key of LEVEL_ORDER) {
    const l = raw?.levels?.[key] ?? {};
    let nodes: ImpactNode[] = arr(l.nodes)
      .slice(0, 4)
      .map((n: Loose, i: number) => {
        let id = str(n?.id, `${PREFIX[key]}${i + 1}`);
        if (usedIds.has(id)) id = `${PREFIX[key]}${i + 1}_${usedIds.size}`;
        usedIds.add(id);
        return {
          id,
          title: str(n?.title, `Signal ${i + 1}`),
          detail: str(n?.detail),
          severity: pick(n?.severity, SEVERITIES, 'medium'),
        };
      });

    if (nodes.length === 0) {
      const id = `${PREFIX[key]}1`;
      usedIds.add(id);
      nodes = [{ id, title: DEFAULT_TITLES[key], detail: str(l.summary), severity: 'medium' }];
    }

    levels[key] = { title: str(l.title, DEFAULT_TITLES[key]), summary: str(l.summary), nodes };
  }

  // Only keep links that go one level forward (macro→regional, regional→direct).
  const levelOf = new Map<string, number>();
  LEVEL_ORDER.forEach((k, i) => levels[k].nodes.forEach((n) => levelOf.set(n.id, i)));

  const links = arr(raw?.links)
    .map((l: Loose) => ({ from: str(l?.from), to: str(l?.to), label: str(l?.label) || undefined }))
    .filter((l) => {
      const a = levelOf.get(l.from);
      const b = levelOf.get(l.to);
      return a !== undefined && b !== undefined && b === a + 1;
    });

  // Guarantee every regional/direct node has an incoming edge.
  for (let i = 1; i < LEVEL_ORDER.length; i++) {
    const prev = levels[LEVEL_ORDER[i - 1]].nodes;
    levels[LEVEL_ORDER[i]].nodes.forEach((n, j) => {
      if (!links.some((l) => l.to === n.id)) {
        links.push({ from: prev[j % prev.length].id, to: n.id, label: undefined });
      }
    });
  }

  const playbook: PlaybookPhase[] = arr(raw?.playbook)
    .slice(0, 3)
    .map((p: Loose, i: number) => ({
      phase: str(p?.phase, ['Immediate', 'Short-term', 'Strategic'][i] ?? `Phase ${i + 1}`),
      horizon: str(p?.horizon, ['0–7 days', '2–6 weeks', '1–6 months'][i] ?? ''),
      actions: arr(p?.actions)
        .slice(0, 4)
        .map((a: Loose) => ({
          title: str(a?.title, 'Action'),
          detail: str(a?.detail),
          priority: pick(a?.priority, PRIORITIES, 'P1'),
          owner: str(a?.owner) || undefined,
        })),
    }))
    .filter((p) => p.actions.length > 0);

  const metrics: ImpactMetric[] = arr(raw?.metrics)
    .slice(0, 4)
    .map((m: Loose) => ({
      label: str(m?.label, 'Indicator'),
      value: str(m?.value, '—'),
      trend: pick(m?.trend, TRENDS, 'flat'),
    }));

  const score = Number(raw?.riskScore);

  return {
    headline: str(raw?.headline, 'Impact assessment'),
    riskScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 50,
    exposure: str(raw?.exposure),
    levels,
    links,
    playbook,
    metrics,
  };
}
