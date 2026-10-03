import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MODELS = ['auto'];

type InMsg = { role: 'user' | 'assistant'; content: string };
type RawMsg = { role?: unknown; sender?: unknown; content?: unknown; text?: unknown };
type DisruptionContext = { title?: string; category?: string; location?: string; impact?: string };

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

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: { messages?: unknown; disruptionContext?: DisruptionContext; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = sanitize(body?.messages);
  const disruptionContext = body?.disruptionContext;
  const wantStream = body?.stream === true;

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ success: false, error: 'Last message must be from the user' }, { status: 400 });
  }

  // 1. Supply AI ke liye General Prompt (Jab koi card select nahi hai - Friendly & Conversational)
  const GENERAL_SUPPLY_AI_PROMPT = `You are Supply AI, a sharp supply-chain and macro-intelligence advisor. 
- Friendly Greeting Rule: When the user says casual greetings like "hi", "hello", or "how are you", respond warmly and naturally in 1-2 lines, asking what they would like to discuss regarding market volatility, logistics, or global supply chain disruptions. Never throw rigid error messages or complain about missing disruption cards.
- General Expertise: Maintain an expert, conversational tone on supply chain risks, market trends, and logistics when answering general queries.`;

  // 2. Strategy Advisor ke liye Smart & Context-Aware Prompt (Jab Disruption Radar se specific article/card select hai)
  let systemPrompt = '';
  if (disruptionContext && disruptionContext.title) {
    const category = disruptionContext.category || 'General';
    const location = disruptionContext.location || 'Global';
    const impact = disruptionContext.impact || 'Assess strategic and operational exposure.';
    const titleLower = (disruptionContext.title + ' ' + category).toLowerCase();

    let customDirective = '';
    let domainFocus = 'Macro-Intelligence & Strategy';

    // Smart Domain Detection based on Card Title/Category (Avoids forcing logistics/raw materials onto finance or workforce news)
    if (titleLower.includes('ipo') || titleLower.includes('rbi') || titleLower.includes('sebi') || titleLower.includes('stocks') || titleLower.includes('shares') || titleLower.includes('private') || titleLower.includes('rejig') || titleLower.includes('valuation') || titleLower.includes('financial')) {
      domainFocus = 'Corporate Governance, Financial Markets & Regulatory Compliance';
      customDirective = 'Focus on capital structure, regulatory compliance (RBI/SEBI rules), shareholder impact, valuation shifts, and corporate restructuring strategies rather than physical supply chains.';
    } else if (titleLower.includes('layoff') || titleLower.includes('job') || titleLower.includes('workforce') || titleLower.includes('hiring') || titleLower.includes('employment') || titleLower.includes('salary')) {
      domainFocus = 'Workforce Dynamics, Talent & Operational Restructuring';
      customDirective = 'Focus on labor market shifts, talent retention, re-skilling, operational cost optimization, and AI/automation substitution impact.';
    } else if (titleLower.includes('shipping') || titleLower.includes('port') || titleLower.includes('freight') || titleLower.includes('logistics') || titleLower.includes('transit')) {
      domainFocus = 'Logistics & Supply Chain Operations';
      customDirective = 'Focus heavily on shipping lanes, freight bottlenecks, alternative transport routes, and warehouse buffer stocking.';
    } else if (titleLower.includes('tech') || titleLower.includes('cyber') || titleLower.includes('software') || titleLower.includes('ai') || titleLower.includes('hardware')) {
      domainFocus = 'Technology & Cybersecurity Dependencies';
      customDirective = 'Focus deeply on hardware/software shortages, vendor tech dependencies, data security, and digital infrastructure resilience.';
    } else {
      domainFocus = 'Strategic Risk & Market Volatility';
      customDirective = 'Focus on strategic realignment, market positioning, risk mitigation, and operational adaptability.';
    }

    systemPrompt = `You are Supply AI acting as a specialized Strategy Advisor focused on ${domainFocus}. 
- MANDATORY CONTEXT ANCHOR: You are operating for a specific live disruption card chosen by the user. 
- CORE RULE: Analyze the disruption based on its true nature (e.g., if it's about finance/IPO/regulations, talk about markets, compliance, and corporate strategy; if it's about jobs, talk about workforce; if it's logistics, talk about supply). NEVER force unrelated physical supply-chain jargon onto corporate, financial, or workforce topics.
- STRUCTURE: Every response must clearly feature the Disruption, Impact, and Opportunity/Action plan.

ACTIVE DISRUPTION CONTEXT:
- Title: "${disruptionContext.title}" (Category: ${category}, Location: ${location})
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
    return NextResponse.json({ success: false, error: 'All models failed or missing body', details: errors }, { status: 502 });
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

