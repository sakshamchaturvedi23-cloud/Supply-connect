import { NextResponse } from 'next/server';
import { extractJson, normalizeAnalysis } from '@/lib/impact-schema';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are a supply-chain and macro-risk analyst.
Return ONLY one JSON object. No markdown, no code fences, no tables, no headings, no commentary.

Schema:
{
  "headline": string (max 14 words),
  "riskScore": integer 0-100,
  "exposure": string (1-2 sentences: why this profile is exposed),
  "levels": {
    "macro":    { "title": string, "summary": string (max 25 words), "nodes": Node[] },
    "regional": { "title": string, "summary": string (max 25 words), "nodes": Node[] },
    "direct":   { "title": string, "summary": string (max 25 words), "nodes": Node[] }
  },
  "links": [ { "from": nodeId, "to": nodeId, "label": string (max 6 words) } ],
  "playbook": [ { "phase": string, "horizon": string, "actions": [ { "title": string (max 8 words), "detail": string (max 30 words), "priority": "P0" | "P1" | "P2", "owner": string } ] } ],
  "metrics": [ { "label": string, "value": string, "trend": "up" | "down" | "flat" } ]
}
Node = { "id": string, "title": string (max 6 words), "detail": string (max 30 words), "severity": "critical" | "high" | "medium" | "low" }

Rules:
- Node ids: macro m1..m3, regional r1..r4, direct d1..d4. 2-4 nodes per level.
- Links only go macro -> regional or regional -> direct. Every regional and direct node needs at least one incoming link.
- Playbook: exactly 3 phases — "Immediate" (0-7 days), "Short-term" (2-6 weeks), "Strategic" (1-6 months) — with 2-4 actions each.
- Metrics: exactly 4 short quantitative indicators, e.g. { "label": "Lead time", "value": "+3-5 wks", "trend": "up" }.
- Be concrete and specific to the user's profession. No generic filler.`;

const MODELS = (process.env.IMPACT_MODELS ?? 'auto')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

async function callModel(model: string, userPrompt: string): Promise<string> {
  const res = await fetch(process.env.LLM_API_URL ?? 'http://localhost:3001/v1/chat/completions', {
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

export async function POST(req: Request) {
  try {
    const { userProfession, disruptionContext } = await req.json();

    if (!userProfession || typeof userProfession !== 'string') {
      return NextResponse.json({ success: false, error: 'userProfession is required' }, { status: 400 });
    }

    const context = disruptionContext
      ? `Active disruption:\nTitle: ${disruptionContext.title ?? ''}\nImpact: ${disruptionContext.impact ?? ''}\nDetails: ${disruptionContext.description ?? ''}`
      : 'No specific disruption selected. Use the most relevant current global supply-chain risks.';

    const userPrompt = `${context}\n\nUser profession / project: ${userProfession.slice(0, 200)}`;

    const errors: string[] = [];
    for (const model of MODELS) {
      try {
        const text = await callModel(model, userPrompt);
        const analysis = normalizeAnalysis(extractJson(text));
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

