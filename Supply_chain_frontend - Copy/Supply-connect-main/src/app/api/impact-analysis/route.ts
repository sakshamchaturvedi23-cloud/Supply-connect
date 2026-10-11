import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { extractJson, normalizeAnalysis } from '@/lib/impact-schema';

export const runtime = 'nodejs';
export const maxDuration = 60; // retries need headroom on Vercel

/* ---------------- Config ---------------- */

const COUNTS = { macro: 3, regional: 4, direct: 4 } as const;
const PHASES = [
  { phase: 'Immediate', horizon: '0-7 days' },
  { phase: 'Short-term', horizon: '2-6 weeks' },
  { phase: 'Strategic', horizon: '1-6 months' },
] as const;
const ACTIONS_MIN = 2;
const ACTIONS_MAX = 4;
const METRICS_COUNT = 4;
const MAX_ATTEMPTS = 2; // per model
const MAX_TOKENS = 4000;

const SYSTEM_PROMPT = `You are a senior risk and strategy analyst. You can analyze ANY business, industry, product, project, career, or real-world situation. You explain how one big external shock travels down to the user, then give a practical playbook.
Return ONLY one JSON object. No markdown, no code fences, no commentary.

Schema (follow the key order):
{
  "headline": string (max 14 words),
  "riskScore": integer 0-100,
  "exposure": string (1-2 sentences, why this profile is exposed),
  "themes": [ { "id": string, "label": string (max 3 words) } ],
  "levels": {
    "macro":    { "title": string, "summary": string (max 25 words), "nodes": Node[] },
    "regional": { "title": string, "summary": string (max 25 words), "nodes": Node[] },
    "direct":   { "title": string, "summary": string (max 25 words), "nodes": Node[] }
  },
  "links": [ { "from": nodeId, "to": nodeId, "label": string (max 8 words, CAUSE -> EFFECT) } ],
  "playbook": [ { "phase": string, "horizon": string, "actions": [ { "title": string (max 8 words), "detail": string (max 30 words), "priority": "P0" | "P1" | "P2", "owner": string } ] } ],
  "metrics": [ { "label": string, "value": string, "trend": "up" | "down" | "flat" } ]
}
Node = { "id": string, "title": string (max 6 words), "detail": string (max 30 words), "severity": "critical" | "high" | "medium" | "low", "theme": themeId, "isRoot": boolean }

HARD SIZE RULES (always the same size, never smaller, never larger):
- levels.macro has EXACTLY 3 nodes: ids m1, m2, m3.
- levels.regional has EXACTLY 4 nodes: ids r1, r2, r3, r4.
- levels.direct has EXACTLY 4 nodes: ids d1, d2, d3, d4.
- playbook has EXACTLY 3 phases in this order: "Immediate" (0-7 days), "Short-term" (2-6 weeks), "Strategic" (1-6 months), each with EXACTLY 3 actions.
- metrics has EXACTLY 4 items.
- themes has 2-4 items.
- Always output ALL sections. The playbook and metrics are mandatory, never omit or shorten them. Keep every text field short so the full JSON fits.

CONTENT RULES:
- INPUT HANDLING: Accept any real business, industry, product, service, project, job, or situation, even if short, informal, or in another language (reply in English). If details are missing, make a reasonable assumption and continue. ONLY if the input is pure small talk (e.g. "hi", "how are you"), gibberish, or clearly not describing anything to analyze: set riskScore 0, headline "Invalid Business Input", exposure "Please describe your business, project, or situation (e.g. EV battery startup, small bakery, freelance designer).", themes [], and return empty nodes, links, playbook and metrics. In this case ignore the size rules.
- NODE TITLES must be specific names of real risks for THIS user (e.g. "Active ingredient shortage", "Port congestion in Asia"). NEVER use placeholders like "Macro Event", "Regional Ripple", "Direct Impact on Your Work".
- THEMES: decide 2-4 themes first (e.g. Inputs, Regulation, Demand, Technology, People, Logistics). Headline and exposure must mention them. Every node carries exactly one theme id, and every theme is used by at least one node.
- SEVERITY: use a realistic mix. Do not mark everything "medium". Use at least one "critical" or "high" node per level when the risk is real.
- LINKS: only macro -> regional or regional -> direct. Add a link only if "from" truly causes or worsens "to", and write the cause -> effect reason in "label". Every regional and direct node needs at least one incoming link; if it truly has no upstream cause set "isRoot": true instead of inventing a link. All other nodes: "isRoot": false.
- PLAYBOOK: "P0" ONLY in Immediate. Short-term uses "P1" or "P2". Strategic uses "P2". Each action is a concrete step tied to a node, with a realistic owner role for THIS kind of business (solo person: "You").
- METRICS: 4 short quantitative indicators relevant to THIS domain, e.g. { "label": "Lead time", "value": "+3-5 wks", "trend": "up" }.
- Be concrete and specific. No generic filler.`;

const MODELS = (process.env.IMPACT_MODELS ?? 'auto')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/* ---------------- Model call ---------------- */

async function callModel(model: string, userPrompt: string): Promise<string> {
  const gatewayUrl =
    process.env.LLM_API_URL || process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:3001/v1';
  const apiUrl = `${gatewayUrl.replace(/\/$/, '')}/chat/completions`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FREELLM_API_KEY || process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error(`${model}: empty response`);
  return text;
}

/* ---------------- Validation ---------------- */

const PLACEHOLDER_TITLES = [
  'macro event',
  'global shock',
  'regional ripple',
  'bottleneck',
  'direct impact on your work',
  'direct impact',
];
const LEVELS = ['macro', 'regional', 'direct'] as const;

function isInvalidInput(a: any): boolean {
  return a?.riskScore === 0 || String(a?.headline ?? '').toLowerCase().includes('invalid business');
}

function validateAnalysis(a: any): string[] {
  const problems: string[] = [];
  if (!a || typeof a !== 'object') return ['Output is not a JSON object'];
  if (isInvalidInput(a)) return []; // valid "rejection" response

  if (!a.headline) problems.push('headline missing');
  if (typeof a.riskScore !== 'number') problems.push('riskScore must be an integer');

  const themeIds = new Set<string>((a.themes ?? []).map((t: any) => t?.id));
  if (themeIds.size < 2 || themeIds.size > 4) problems.push('themes must have 2-4 items');

  const usedThemes = new Set<string>();
  const nodeIds = new Set<string>();
  for (const lvl of LEVELS) {
    const nodes = a.levels?.[lvl]?.nodes;
    if (!Array.isArray(nodes) || nodes.length !== COUNTS[lvl]) {
      problems.push(`levels.${lvl}.nodes must have exactly ${COUNTS[lvl]} nodes (got ${Array.isArray(nodes) ? nodes.length : 0})`);
      continue;
    }
    for (const n of nodes) {
      nodeIds.add(n?.id);
      const t = String(n?.title ?? '').toLowerCase();
      if (!t || PLACEHOLDER_TITLES.some((p) => t.includes(p))) {
        problems.push(`node ${n?.id} has a placeholder or empty title, use a specific risk name`);
      }
      if (!n?.detail) problems.push(`node ${n?.id} is missing detail`);
      if (themeIds.size && !themeIds.has(n?.theme)) problems.push(`node ${n?.id} has an unknown theme`);
      else usedThemes.add(n?.theme);
    }
  }
  if (themeIds.size && [...themeIds].some((t) => !usedThemes.has(t))) {
    problems.push('every theme must be used by at least one node');
  }

  if (!Array.isArray(a.links) || a.links.length < 4) problems.push('links must contain at least 4 real cause->effect links');

  const pb = a.playbook;
  if (!Array.isArray(pb) || pb.length !== PHASES.length) {
    problems.push(`playbook must have exactly ${PHASES.length} phases (got ${Array.isArray(pb) ? pb.length : 0})`);
  } else {
    pb.forEach((p: any, i: number) => {
      const n = Array.isArray(p?.actions) ? p.actions.length : 0;
      if (n < ACTIONS_MIN || n > ACTIONS_MAX) problems.push(`playbook phase ${PHASES[i].phase} needs ${ACTIONS_MIN}-${ACTIONS_MAX} actions (got ${n})`);
    });
  }

  if (!Array.isArray(a.metrics) || a.metrics.length !== METRICS_COUNT) {
    problems.push(`metrics must have exactly ${METRICS_COUNT} items`);
  }
  return problems;
}

// Minimum bar to ship a "degraded" result when no attempt was perfect
function isUsable(a: any): boolean {
  if (!a) return false;
  if (isInvalidInput(a)) return true;
  const nodesOk = LEVELS.every((l) => (a.levels?.[l]?.nodes?.length ?? 0) >= 2);
  const playbookOk = Array.isArray(a.playbook) && a.playbook.length === PHASES.length && a.playbook.every((p: any) => (p?.actions?.length ?? 0) >= 1);
  return nodesOk && playbookOk;
}

/* ---------------- Post-processing ---------------- */

const PRIORITY_ORDER = ['P0', 'P1', 'P2'];
const SEVERITY_SCORE: Record<string, number> = { critical: 90, high: 70, medium: 45, low: 20 };

function clampPlaybook(playbook: any[]): any[] {
  if (!Array.isArray(playbook)) return [];
  return PHASES.map((meta, idx) => {
    const src = playbook[idx] ?? {};
    return {
      ...src,
      phase: meta.phase, // force canonical names so the UI always has 3 stable columns
      horizon: meta.horizon,
      actions: (src.actions ?? []).slice(0, ACTIONS_MAX).map((a: any) => {
        const cur = PRIORITY_ORDER.indexOf(a?.priority);
        const safe = cur === -1 ? idx : Math.max(cur, idx); // Immediate>=P0, Short-term>=P1, Strategic>=P2
        return { ...a, priority: PRIORITY_ORDER[Math.min(safe, 2)] };
      }),
    };
  });
}

function cleanLinks(analysis: any): any[] {
  const levels = analysis?.levels;
  if (!levels) return [];
  const levelOf = new Map<string, string>();
  LEVELS.forEach((lvl) => (levels[lvl]?.nodes ?? []).forEach((n: any) => levelOf.set(n.id, lvl)));
  const allowed: Record<string, string> = { macro: 'regional', regional: 'direct' };

  const seen = new Set<string>();
  return (analysis.links ?? []).filter((l: any) => {
    const from = levelOf.get(l?.from);
    const to = levelOf.get(l?.to);
    if (!from || !to || allowed[from] !== to) return false;
    if (!l?.label || !String(l.label).trim()) return false;
    const key = `${l.from}->${l.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Blend the model's score with what the nodes actually say, so score and chart never disagree
function reconcileScore(analysis: any): number {
  const nodes = LEVELS.flatMap((l) => analysis.levels?.[l]?.nodes ?? []);
  const modelScore = Math.max(0, Math.min(100, Math.round(Number(analysis.riskScore) || 0)));
  if (!nodes.length) return modelScore;
  const avg = nodes.reduce((s: number, n: any) => s + (SEVERITY_SCORE[n?.severity] ?? 45), 0) / nodes.length;
  return Math.round(0.5 * modelScore + 0.5 * avg);
}

function postProcess(analysis: any, raw: any) {
  if (!analysis) return analysis;

  if (isInvalidInput(analysis) || isInvalidInput(raw)) {
    analysis.invalid = true;
    analysis.riskScore = 0;
    return analysis;
  }

  // normalizeAnalysis may strip custom fields, so restore them from the raw output
  if (!analysis.themes && Array.isArray(raw?.themes)) analysis.themes = raw.themes;
  const rawNodes = new Map<string, any>();
  LEVELS.forEach((l) => (raw?.levels?.[l]?.nodes ?? []).forEach((n: any) => rawNodes.set(n.id, n)));
  LEVELS.forEach((l) =>
    (analysis.levels?.[l]?.nodes ?? []).forEach((n: any) => {
      if (!n.theme) n.theme = rawNodes.get(n.id)?.theme;
    }),
  );

  analysis.playbook = clampPlaybook(analysis.playbook?.length ? analysis.playbook : raw?.playbook);
  analysis.links = cleanLinks(analysis);

  const hasIncoming = new Set((analysis.links ?? []).map((l: any) => l.to));
  (['regional', 'direct'] as const).forEach((lvl) =>
    (analysis.levels?.[lvl]?.nodes ?? []).forEach((n: any) => {
      n.isRoot = !hasIncoming.has(n.id);
    }),
  );
  (analysis.levels?.macro?.nodes ?? []).forEach((n: any) => {
    n.isRoot = true;
  });

  analysis.riskScore = reconcileScore(analysis);
  analysis.invalid = false;
  return analysis;
}

/* ---------------- Route ---------------- */

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { userProfession, disruptionContext } = await req.json();

    if (!userProfession || typeof userProfession !== 'string') {
      return NextResponse.json({ success: false, error: 'userProfession is required' }, { status: 400 });
    }

    const clip = (v: unknown, n = 400) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, n) : '');

    const context = disruptionContext
      ? `Active disruption:\nTitle: ${clip(disruptionContext.title)}\nImpact: ${clip(disruptionContext.impact)}\nDetails: ${clip(disruptionContext.description)}`
      : 'No specific disruption selected. Use the most relevant current global risks (economic, regulatory, technological, geopolitical, climate, supply-chain) for this profile.';

    const baseUserPrompt = `${context}\n\nUser business / project / situation: ${userProfession.trim().slice(0, 500)}`;

    const errors: string[] = [];
    let best: { analysis: any; model: string; problems: string[] } | null = null;

    for (const model of MODELS) {
      let feedback = '';
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const prompt = feedback ? `${baseUserPrompt}\n\n${feedback}` : baseUserPrompt;
          const text = await callModel(model, prompt);
          const raw = extractJson(text);
          const problems = validateAnalysis(raw);

          if (problems.length === 0) {
            const analysis = postProcess(normalizeAnalysis(raw), raw);
            return NextResponse.json({ success: true, analysis, modelUsed: model, degraded: false });
          }

          // keep the least-bad candidate in case nothing passes
          if (isUsable(raw) && (!best || problems.length < best.problems.length)) {
            best = { analysis: postProcess(normalizeAnalysis(raw), raw), model, problems };
          }
          errors.push(`${model} attempt ${attempt}: ${problems.slice(0, 4).join('; ')}`);
          feedback = `Your previous JSON was rejected. Fix ALL of these and return the complete JSON again:\n- ${problems.slice(0, 8).join('\n- ')}`;
        } catch (e) {
          errors.push(`${model} attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    if (best) {
      console.warn('[impact] returning degraded result', best.problems);
      return NextResponse.json({
        success: true,
        analysis: best.analysis,
        modelUsed: best.model,
        degraded: true,
      });
    }

    return NextResponse.json({ success: false, error: 'All models failed', details: errors }, { status: 502 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 500 });
  }
}

