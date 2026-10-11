/**
 * Client helper for /api/chat. Streams when the backend streams,
 * and falls back to a JSON reply ({ success, reply }) otherwise.
 */

export type ApiMessage = { role: 'user' | 'assistant'; content: string };

export async function streamChat({
  messages,
  disruptionContext,
  signal,
  onDelta,
}: {
  messages: ApiMessage[];
  disruptionContext?: unknown;
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
}): Promise<{ modelUsed?: string }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, disruptionContext, stream: true }),
    signal,
  });

  const modelUsed = res.headers.get('x-model-used') ?? undefined;

  if ((res.headers.get('content-type') ?? '').includes('application/json')) {
    const data = await res.json().catch(() => null);
    const text = [data?.reply, data?.message, data?.content, data?.choices?.[0]?.message?.content].find(
      (v) => typeof v === 'string' && v.trim(),
    );
    if (!res.ok || !text || data?.success === false) {
      throw new Error(data?.error ?? `Supply AI returned ${res.status}`);
    }
    onDelta(text);
    return { modelUsed: data?.modelUsed ?? modelUsed };
  }

  if (!res.ok || !res.body) throw new Error(`Supply AI returned ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onDelta(chunk);
  }
  return { modelUsed };
}

/* ------------------------------------------------------------------ */
/* <followups> — the model appends suggested next questions            */
/* ------------------------------------------------------------------ */

const OPEN = '<followups>';
const CLOSE = '</followups>';

export function splitFollowups(text: string): { body: string; followups: string[] } {
  const start = text.indexOf(OPEN);
  if (start === -1) {
    // Hide a half-streamed "<follo" at the very end.
    const lt = text.lastIndexOf('<');
    if (lt !== -1 && text.length - lt < OPEN.length && OPEN.startsWith(text.slice(lt))) {
      return { body: text.slice(0, lt), followups: [] };
    }
    return { body: text, followups: [] };
  }
  const body = text.slice(0, start).trimEnd();
  const end = text.indexOf(CLOSE, start);
  if (end === -1) return { body, followups: [] };
  const inner = text.slice(start + OPEN.length, end).trim();
  let followups: string[] = [];
  try {
    const parsed: unknown = JSON.parse(inner);
    if (Array.isArray(parsed)) followups = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    followups = inner
      .split('\n')
      .map((s) => s.replace(/^[-*\d.\s"]+|["\s,]+$/g, ''))
      .filter(Boolean);
  }
  return { body, followups: followups.slice(0, 3) };
}
