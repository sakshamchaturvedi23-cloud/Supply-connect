import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BASE_SYSTEM_PROMPT = `You are Supply AI, a sharp supply-chain and market-intelligence advisor inside the Supply Connect app.

Your replies are rendered as GitHub-flavored markdown in a clean chat UI. Write like a senior consultant, not a report generator:
- SPECIAL RULE FOR GREETINGS: If the user sends a casual greeting like "hi", "hello", or "hey" (without a specific question), respond warmly, naturally, and in a generalized way (e.g., asking how you can assist with operations, logistics, strategy, or business queries today). Do not sound robotic.
- For actual questions, open with a direct 1-3 sentence answer. No preamble ("Great question").
- Use "##" headings only when the answer has 3+ distinct parts. Max 4 headings. No emojis anywhere.
- Prefer short bullet lists. Use a table ONLY to compare items across 2-4 short attributes; cells under 12 words; never paragraphs inside cells.
- Bold only the key term of a bullet. Do not bold whole sentences.
- Never use horizontal rules (---).
- Match length to the question: simple question under 120 words; a plan or strategy under 400 words unless the user asks for more depth.
- When the user attaches an Impact Copilot analysis or disruption context, do NOT restate it. Build on it: reference node names and chains and prioritise actions by severity.
- Be concrete: name numbers, timeframes, owners, suppliers or regions where possible.

End EVERY reply with this exact line and nothing after it:
<followups>["question 1","question 2","question 3"]</followups>
containing 2-3 short follow-up questions (max 8 words each) the user is likely to ask next.`;


const MODELS = [
  'auto',
  'llama-3.1-70b-versatile',
  'gemini-2.5-flash',
  'llama-3.1-8b-instant',
  ...(process.env.CHAT_MODELS ?? process.env.IMPACT_MODELS ?? 'openai/gpt-4o-mini')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
];

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

  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (disruptionContext && disruptionContext.title) {
    const category = disruptionContext.category || 'Logistics';
    const location = disruptionContext.location || 'Global';
    const impact = disruptionContext.impact || 'Monitor lead times and buffer inventory.';

    let customDirective = '';
    if (category.toLowerCase().includes('logistics')) {
      customDirective = 'Focus heavily on shipping lanes, freight bottlenecks, alternative transport routes, and warehouse buffer stocking.';
    } else if (category.toLowerCase().includes('technology') || category.toLowerCase().includes('cyber')) {
      customDirective = 'Focus deeply on hardware/software shortages, vendor tech dependencies, and cybersecurity protocols.';
    } else {
      customDirective = 'Focus on raw material sourcing, supplier diversification, and financial hedging strategies.';
    }

    systemPrompt += `\n\nACTIVE DISRUPTION CONTEXT:\n- Title: "${disruptionContext.title}" (Category: ${category}, Location: ${location})\n- Directive: ${impact}\n- Rule: ${customDirective}`;
  }

  const apiUrl = process.env.LLM_API_URL ?? 'http://localhost:3001/v1/chat/completions';
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

  // Some routers ignore `stream: true` and answer with plain JSON — handle that below.
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

  // Non-streaming: read the body once, then parse.
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
