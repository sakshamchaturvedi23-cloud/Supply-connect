import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { extractJson, normalizeAnalysis } from '@/lib/impact-schema';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are a senior risk and strategy analyst. You can analyze ANY business, industry, product, project, career, or real-world situation, and you explain how a big external shock travels down to the user, then give a practical playbook.
Return ONLY one JSON object. No markdown, no code fences, no tables, no headings, no commentary.

Schema:
{
  "headline": string (max 14 words),
  "riskScore": integer 0-100,
  "exposure": string (1-2 sentences: why this profile is exposed),
  "themes": [ { "id": string, "label": string (max 3 words) } ],
  "levels": {
    "macro":    { "title": string, "summary": string (max 25 words), "nodes": Node[] },
    "regional": { "title": string, "summary": string (max 25 words), "nodes": Node[] },
    "direct":   { "title": string, "summary": string (max 25 words), "nodes": Node[] }
  },
  "links": [ { "from": nodeId, "to": nodeId, "label": string (max 8 words, the CAUSE -> EFFECT reason) } ],
  "playbook": [ { "phase": string, "horizon": string, "actions": [ { "title": string (max 8 words), "detail": string (max 30 words), "priority": "P0" | "P1" | "P2", "owner": string } ] } ],
  "metrics": [ { "label": string, "value": string, "trend": "up" | "down" | "flat" } ]
}
Node = { "id": string, "title": string (max 6 words), "detail": string (max 30 words), "severity": "critical" | "high" | "medium" | "low", "theme": themeId, "isRoot": boolean }

Rules:
- INPUT HANDLING: Accept any real business, industry, product, service, project, job, or situation, even if short, informal, or in any language (reply in English). If details are missing, make a reasonable assumption and continue. ONLY if the input is pure small talk (e.g. "hi", "how are you"), gibberish, or clearly not describing anything to analyze, set riskScore to 0, headline to "Invalid Business Input", exposure to "Please describe your business, project, or situation (e.g. EV battery startup, small bakery, freelance designer).", themes [] , and return empty arrays for levels nodes, links, playbook, and metrics.
- THEMES: First decide 2-4 themes that the analysis will focus on (e.g. "Inputs", "Regulation", "Demand", "Technology", "People", "Logistics"; choose what truly fits THIS user). The headline and exposure must mention these same themes. Every node must carry exactly one theme id, and every theme must be used by at least one node. Do not add nodes outside these themes.
- Node ids: macro m1..m3, regional r1..r4, direct d1..d4. 2-4 nodes per level.
- LINKS must be real causal chains: only add a link if the "from" node truly causes or worsens the "to" node, and put that cause -> effect reason in "label" (e.g. "port delay -> lead time +3-5 wks"). Never connect nodes just to fill the diagram.
- Links only go macro -> regional or regional -> direct. Every regional and direct node needs at least one incoming link. If a node genuinely has no upstream cause in this analysis, set "isRoot": true on it instead of inventing a link. For all other nodes, "isRoot" is false.
- Playbook: exactly 3 phases — "Immediate" (0-7 days), "Short-term" (2-6 weeks), "Strategic" (1-6 months) — with 2-4 actions each, ordered by urgency.
- PRIORITY RULES: "P0" (do now) is ONLY allowed in the Immediate phase. Short-term actions use "P1" or "P2". Strategic actions use "P2". Every action must be a concrete step the user can start, tied to a node in the chart, with a realistic owner role for THIS kind of business (for a solo person, use "You" or a role they could hire).
- Metrics: exactly 4 short quantitative indicators relevant to THIS domain (not always supply-chain metrics), e.g. { "label": "Customer acquisition cost", "value": "+15-20%", "trend": "up" }.
- Be concrete and specific to the user's profession or project. No generic filler.`;

const MODELS = (process.env.IMPACT_MODELS ?? 'auto')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

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
      temperature: 0.4,
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

/* ---------- Post-processing: enforce rules even if the model slips ---------- */

const PRIORITY_ORDER = ['P0', 'P1', 'P2'];
// Minimum priority index allowed per phase: Immediate>=P0, Short-term>=P1, Strategic>=P2
const MIN_PRIORITY_BY_PHASE = [0, 1, 2];

function clampPlaybook(playbook: any[]): any[] {
  if (!Array.isArray(playbook)) return [];
  return playbook.map((phase, idx) => {
    const minIdx = MIN_PRIORITY_BY_PHASE[idx] ?? 2;
    return {
      ...phase,
      actions: (phase?.actions ?? []).map((a: any) => {
        const cur = PRIORITY_ORDER.indexOf(a?.priority);
        const safe = cur === -1 ? minIdx : Math.max(cur, minIdx);
        return { ...a, priority: PRIORITY_ORDER[safe] };
      }),
    };
  });
}

function cleanLinks(analysis: any): any[] {
  const levels = analysis?.levels;
  if (!levels) return [];
  const levelOf = new Map<string, 'macro' | 'regional' | 'direct'>();
  (['macro', 'regional', 'direct'] as const).forEach((lvl) =>
    (levels[lvl]?.nodes ?? []).forEach((n: any) => levelOf.set(n.id, lvl)),
  );
  const allowed: Record<string, string> = { macro: 'regional', regional: 'direct' };

  const seen = new Set<string>();
  return (analysis.links ?? []).filter((l: any) => {
    const from = levelOf.get(l?.from);
    const to = levelOf.get(l?.to);
    if (!from || !to || allowed[from] !== to) return false; // unknown id or wrong direction
    if (!l?.label || !String(l.label).trim()) return false; // no reason given = weak link
    const key = `${l.from}->${l.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function postProcess(analysis: any) {
  if (!analysis) return analysis;
  analysis.playbook = clampPlaybook(analysis.playbook);
  analysis.links = cleanLinks(analysis);

  // Nodes without an incoming link are marked as roots instead of showing fake lines
  const hasIncoming = new Set((analysis.links ?? []).map((l: any) => l.to));
  (['regional', 'direct'] as const).forEach((lvl) => {
    (analysis.levels?.[lvl]?.nodes ?? []).forEach((n: any) => {
      n.isRoot = !hasIncoming.has(n.id);
    });
  });
  return analysis;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  try {
    const { userProfession, disruptionContext } = await req.json();

    if (!userProfession || typeof userProfession !== 'string') {
      return NextResponse.json({ success: false, error: 'userProfession is required' }, { status: 400 });
    }

    const context = disruptionContext
      ? `Active disruption:\nTitle: ${disruptionContext.title ?? ''}\nImpact: ${disruptionContext.impact ?? ''}\nDetails: ${disruptionContext.description ?? ''}`
      : 'No specific disruption selected. Use the most relevant current global risks (economic, regulatory, technological, geopolitical, climate, supply-chain) for this profile.';

    const userPrompt = `${context}\n\nUser business / project / situation: ${userProfession.trim().slice(0, 500)}`;

    const errors: string[] = [];
    for (const model of MODELS) {
      try {
        const text = await callModel(model, userPrompt);
        const analysis = postProcess(normalizeAnalysis(extractJson(text)));
        return NextResponse.json({ success: true, analysis, modelUsed: model });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    return NextResponse.json({ success: false, error: 'All models failed', details: errors }, { status: 502 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 500 });
  }
}

