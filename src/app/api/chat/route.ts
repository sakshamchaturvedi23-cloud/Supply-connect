import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MODELS = ['auto'];

type InMsg = { role: 'user' | 'assistant'; content: string };
type RawMsg = { role?: unknown; sender?: unknown; content?: unknown; text?: unknown };
type DisruptionContext = {
  title?: string;
  category?: string;
  location?: string;
  impact?: string;
  description?: string;
  headline?: string;
  riskScore?: number | string;
  invalid?: boolean;
  [key: string]: unknown;
};

function sanitize(raw: unknown): InMsg[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawMsg[])
    .map((m) => {
      const roleField = m?.role || m?.sender;
      const contentField = m?.content || m?.text;

      const role = roleField === 'user' || roleField === 'assistant' ? roleField : null;
      const content = typeof contentField === 'string' ? contentField.trim() : '';

      if (!role || !content) return null;
      return { role, content: content.slice(0, 16000) };
    })
    .filter(Boolean) as InMsg[];
}

/* ---------------- Helpers ---------------- */

// Clamp + clean any string before it goes inside the system prompt
function clamp(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

// Word-boundary keyword match (avoids "ai" matching "retail", "port" matching "report")
function hasWord(text: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

const INVALID_MARKERS = ['invalid business input', 'invalid business', 'invalid impact'];

function looksInvalid(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, any>;

  // 1) explicit flags / score
  if (p.invalid === true || p.isInvalid === true) return true;
  if (p.riskScore !== undefined && p.riskScore !== null && Number(p.riskScore) === 0) return true;

  // 2) marker text anywhere inside the payload
  try {
    const flat = JSON.stringify(p).toLowerCase();
    if (INVALID_MARKERS.some((m) => flat.includes(m))) return true;
  } catch {
    /* circular or unserializable, ignore */
  }

  // 3) levels exist but every level has zero nodes = empty analysis
  const levels = p.levels;
  if (levels && typeof levels === 'object') {
    const lv = [levels.macro, levels.regional, levels.direct];
    const allEmpty = lv.every((l) => !Array.isArray(l?.nodes) || l.nodes.length === 0);
    if (allEmpty) return true;
  }
  return false;
}

function isInvalidImpact(body: Record<string, any>, lastUserMessage: string): boolean {
  const payloads = [body?.disruptionContext, body?.impactContext, body?.impactAnalysis, body?.analysis];
  if (payloads.some(looksInvalid)) return true;
  return lastUserMessage.toLowerCase().includes('invalid business input');
}

function guardrailResponse(reply: string, wantStream: boolean) {
  if (wantStream) {
    return new Response(reply, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Model-Used': 'guardrail',
      },
    });
  }
  return NextResponse.json({ success: true, reply, modelUsed: 'guardrail' });
}

const INVALID_REPLY =
  "⚠️ **Invalid Impact Report Attached**\n\nThe attached Impact Copilot report is based on an invalid or empty business input, so there is nothing real to build an action plan on.\n\nPlease go back to **Impact Copilot**, describe a valid industry, product, project, or business (e.g., *'EV battery startup'*, *'small bakery'*, *'freelance designer'*), and attach that new analysis here. I'll turn it into a prioritized plan right away.";

const INVALID_CONTEXT_RULE = `
- INVALID CONTEXT RULE: If the attached Impact Copilot data is empty, has riskScore 0, is titled "Invalid Business Input", or contains no real risk nodes, do NOT invent risks, levels, or an action plan. Reply briefly that the report has no usable data and ask the user to describe a valid business, project, or situation first.`;

/* ---------------- Route ---------------- */

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = sanitize(body?.messages);
  const disruptionContext = body?.disruptionContext as DisruptionContext | undefined;
  const wantStream = body?.stream === true;

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ success: false, error: 'Last message must be from the user' }, { status: 400 });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[chat] body keys:', Object.keys(body), '| context keys:', Object.keys(disruptionContext ?? {}));
  }

  // --- GUARDRAIL: never generate plans for invalid / empty Impact reports ---
  if (isInvalidImpact(body, messages[messages.length - 1].content)) {
    return guardrailResponse(INVALID_REPLY, wantStream);
  }

  // 1. General prompt (no card selected: friendly & conversational)
  const GENERAL_SUPPLY_AI_PROMPT = `You are Supply AI, a sharp supply-chain and macro-intelligence advisor.
- Friendly Greeting Rule: When the user says casual greetings like "hi", "hello", or "how are you", respond warmly and naturally in 1-2 lines, asking what they would like to discuss regarding market volatility, logistics, or global supply chain disruptions. Never throw rigid error messages or complain about missing disruption cards.
- General Expertise: Maintain an expert, conversational tone on supply chain risks, market trends, and logistics when answering general queries.${INVALID_CONTEXT_RULE}`;

  // 2. Strategy Advisor prompt (a Disruption Radar card / Impact report is attached)
  let systemPrompt = '';
  if (disruptionContext && disruptionContext.title) {
    const title = clamp(disruptionContext.title);
    const category = clamp(disruptionContext.category) || 'General';
    const location = clamp(disruptionContext.location) || 'Global';
    const impact = clamp(disruptionContext.impact) || 'Assess strategic and operational exposure.';
    const titleLower = `${title} ${category}`.toLowerCase();

    let customDirective = '';
    let domainFocus = 'Macro-Intelligence & Strategy';

    if (hasWord(titleLower, ['ipo', 'rbi', 'sebi', 'stocks', 'shares', 'private', 'rejig', 'valuation', 'financial'])) {
      domainFocus = 'Corporate Governance, Financial Markets & Regulatory Compliance';
      customDirective =
        'Focus on capital structure, regulatory compliance (RBI/SEBI rules), shareholder impact, valuation shifts, and corporate restructuring strategies rather than physical supply chains.';
    } else if (hasWord(titleLower, ['layoff', 'layoffs', 'job', 'jobs', 'workforce', 'hiring', 'employment', 'salary'])) {
      domainFocus = 'Workforce Dynamics, Talent & Operational Restructuring';
      customDirective =
        'Focus on labor market shifts, talent retention, re-skilling, operational cost optimization, and AI/automation substitution impact.';
    } else if (hasWord(titleLower, ['shipping', 'port', 'ports', 'freight', 'logistics', 'transit'])) {
      domainFocus = 'Logistics & Supply Chain Operations';
      customDirective =
        'Focus heavily on shipping lanes, freight bottlenecks, alternative transport routes, and warehouse buffer stocking.';
    } else if (hasWord(titleLower, ['tech', 'cyber', 'software', 'ai', 'hardware'])) {
      domainFocus = 'Technology & Cybersecurity Dependencies';
      customDirective =
        'Focus deeply on hardware/software shortages, vendor tech dependencies, data security, and digital infrastructure resilience.';
    } else {
      domainFocus = 'Strategic Risk & Market Volatility';
      customDirective =
        'Focus on strategic realignment, market positioning, risk mitigation, and operational adaptability.';
    }

    systemPrompt = `You are Supply AI acting as a specialized Strategy Advisor focused on ${domainFocus}.
- MANDATORY CONTEXT ANCHOR: You are operating for a specific live disruption card chosen by the user.
- CORE RULE: Analyze the disruption based on its true nature (e.g., if it's about finance/IPO/regulations, talk about markets, compliance, and corporate strategy; if it's about jobs, talk about workforce; if it's logistics, talk about supply). NEVER force unrelated physical supply-chain jargon onto corporate, financial, or workforce topics.
- STRUCTURE: Every response must clearly feature the Disruption, Impact, and Opportunity/Action plan.${INVALID_CONTEXT_RULE}

ACTIVE DISRUPTION CONTEXT:
- Title: "${title}" (Category: ${category}, Location: ${location})
- Core Directive: ${impact}
- Domain Rule: ${customDirective}`;
  } else {
    systemPrompt = GENERAL_SUPPLY_AI_PROMPT;
  }

  const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || process.env.LLM_API_URL || 'http://localhost:3001/v1';
  const apiUrl = `${gatewayUrl.replace(/\/$/, '')}/chat/completions`;
  const apiKey = process.env.FREELLM_API_KEY || process.env.LLM_API_KEY;

  let upstream: Response | null = null;
  let modelUsed = '';
  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        signal: req.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          stream: wantStream,
          temperature: 0.5,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      });
      if (res.ok && res.body) {
        upstream = res;
        modelUsed = model;
        break;
      }
      errors.push(`${model}: HTTP ${res.status}`);
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!upstream || !upstream.body) {
    console.error('All chat models failed or body is missing', errors);
    return NextResponse.json(
      { success: false, error: 'All models failed or missing body', details: errors },
      { status: 502 },
    );
  }

  const upstreamIsJson = (upstream.headers.get('content-type') ?? '').includes('application/json');

  if (wantStream && !upstreamIsJson) {
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta) controller.enqueue(encoder.encode(delta));
              } catch {
                // partial line
              }
            }
          }
        } catch (e) {
          console.error('Stream error', e);
        } finally {
          controller.close();
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Model-Used': modelUsed,
      },
    });
  }

  const raw = await upstream.text();
  let reply = raw;
  try {
    const data = JSON.parse(raw);
    reply = data?.choices?.[0]?.message?.content || data?.reply || '';
  } catch {
    /* plain-text upstream */
  }
  const cut = reply.indexOf('<followups>');
  if (cut !== -1) reply = reply.slice(0, cut).trimEnd();
  return NextResponse.json({ success: true, reply: reply || 'I am ready to assist you.', modelUsed });
}


