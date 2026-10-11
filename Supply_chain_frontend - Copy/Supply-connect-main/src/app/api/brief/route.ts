import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';
import { extractJson } from '@/lib/impact-schema';
import { briefKey, type BriefSignal, type DailyBrief } from '@/lib/brief';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are the editor of a short morning supply-chain brief for small business owners and founders.
Read today's risk signals and return ONLY one JSON object, no markdown, no commentary:
{
  "changed": string,   // 1-2 sentences, max 35 words: what changed in the world, naming the concrete events
  "affected": string,  // 1 sentence, max 25 words: which industries or kinds of business feel it, and how
  "action": string,    // 1 sentence, max 25 words: an imperative, concrete step with a timeframe
  "signalIds": string[] // ids of the 2-5 signals you relied on most
}
Write in plain English a shop owner understands. No jargon, no emojis, no hedging filler. Connect related signals instead of listing them.`;

const MODELS = (process.env.BRIEF_MODELS ?? process.env.IMPACT_MODELS ?? 'auto')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/* Server-side cache: every visitor on the same day shares one brief. */
const cache = new Map<string, DailyBrief>();

const clean = (v: unknown, max = 320) =>
  typeof v === 'string'
    ? v.replace(/\*\*|__|`|#/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';

function normalize(raw: unknown, ids: Set<string>): DailyBrief | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const brief: DailyBrief = {
    changed: clean(r.changed),
    affected: clean(r.affected),
    action: clean(r.action),
    signalIds: Array.isArray(r.signalIds) ? r.signalIds.map(String).filter((id) => ids.has(id)).slice(0, 5) : [],
  };
  return brief.changed && brief.affected && brief.action ? brief : null;
}

async function callModel(model: string, userPrompt: string): Promise<string> {
  const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || process.env.LLM_API_URL || 'https://freellmapi-backend-ldf9.onrender.com/v1';
  const apiUrl = `${gatewayUrl.replace(/\/$/, '')}/chat/completions`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FREELLM_API_KEY || process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
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
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: { day?: string; signals?: BriefSignal[]; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const signals = (Array.isArray(body.signals) ? body.signals : [])
    .filter((s) => s && s.id && s.title)
    .slice(0, 12);
  if (!signals.length) {
    return NextResponse.json({ success: false, error: 'No signals to summarise' }, { status: 400 });
  }

  const day = typeof body.day === 'string' ? body.day.slice(0, 20) : new Date().toISOString().slice(0, 10);
  const key = briefKey(day, signals);
  if (!body.force && cache.has(key)) {
    return NextResponse.json({ success: true, brief: cache.get(key), cached: true });
  }

  const lines = signals.map(
    (s) =>
      `- id=${s.id} | ${s.severity ?? 'Medium'} | ${s.category ?? 'General'} | ${s.location ?? 'Global'} | ${clean(s.title, 200)}${
        s.impact ? ` | impact: ${clean(s.impact, 240)}` : ''
      }`,
  );
  const userPrompt = `Today is ${day}. Risk signals:\n${lines.join('\n')}`;
  const ids = new Set(signals.map((s) => String(s.id)));

  const errors: string[] = [];
  for (const model of MODELS) {
    try {
      const brief = normalize(extractJson(await callModel(model, userPrompt)), ids);
      if (!brief) throw new Error(`${model}: incomplete brief`);
      if (cache.size > 50) cache.clear();
      cache.set(key, brief);
      return NextResponse.json({ success: true, brief, modelUsed: model });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  console.error('Daily brief failed', errors);
  return NextResponse.json({ success: false, error: 'All models failed', details: errors }, { status: 502 });
}
