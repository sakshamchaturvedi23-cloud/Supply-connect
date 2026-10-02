'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Bookmark, Check, MapPin } from 'lucide-react';
import { AssistantMessage, UserBubble } from '@/components/chat/Messages';
import { Composer } from '@/components/chat/Composer';
import { Button, IconButton } from '@/components/ui/Button';
import { SeverityBadge } from '@/components/ui/Badge';
import { Disruption, fetchDisruption } from '@/lib/disruptions';
import { AdvisorMessage, readAdvisorChat, useAdvisorChats } from '@/lib/saved';
import { splitFollowups, streamChat } from '@/lib/chat/stream';
import { useAutoScroll } from '@/lib/chat/useAutoScroll';
import { decodeEntities, parseImpact, uid } from '@/lib/text';

const GREETING: AdvisorMessage = {
  role: 'assistant',
  content:
    'I’m your strategy advisor. Tell me about your business and I’ll help you protect it from supply shocks, or find the opportunity inside one.',
};

const STARTERS = [
  'How do I protect my margins from this?',
  'Which suppliers or regions should I diversify to?',
  'Is there a business opportunity here?',
];

function contextMessage(d: Disruption): AdvisorMessage {
  const where = [d.location, d.category].filter(Boolean).map((x) => decodeEntities(x)).join(', ');
  return {
    role: 'assistant',
    content: `You’re looking at **${decodeEntities(d.title)}**${where ? ` (${where})` : ''}. Do you want to limit the damage to your supply chain, or find a way to benefit from it?`,
  };
}

function AdvisorContent() {
  const params = useSearchParams();
  const disruptionId = params.get('id');
  const sessionParam = params.get('sessionId');
  const { upsert, get: getSaved } = useAdvisorChats();

  const [sessionId] = useState(() => sessionParam ?? `session_${uid()}`);
  const [disruption, setDisruption] = useState<Disruption | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const restoredRef = useRef(false);
  const { ref: scrollRef, onScroll, pin } = useAutoScroll<HTMLDivElement>(messages);

  const alreadySaved = Boolean(getSaved(sessionId));

  /* ---------- load context / resume a saved session ---------- */

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = sessionParam ? readAdvisorChat(sessionParam) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    if (saved?.messages?.length) setMessages(saved.messages);

    const id = disruptionId ?? saved?.disruptionId;
    if (!id) return;
    fetchDisruption(id)
      .then((d) => {
        if (!d) return;
        setDisruption(d);
        if (!saved) setMessages((prev) => (prev.length === 1 ? [...prev, contextMessage(d)] : prev));
      })
      .catch((e) => console.error('Could not load signal', e));
  }, [disruptionId, sessionParam]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* ---------- chat ---------- */

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || abortRef.current) return;

      const history: AdvisorMessage[] = [...messages, { role: 'user', content }];
      const replyIndex = history.length;
      setMessages([...history, { role: 'assistant', content: '' }]);
      setInput('');
      setErrorIndex(null);
      setStreaming(true);
      pin();

      const controller = new AbortController();
      abortRef.current = controller;
      const patch = (fn: (m: AdvisorMessage) => AdvisorMessage) =>
        setMessages((prev) => prev.map((m, i) => (i === replyIndex ? fn(m) : m)));

      try {
        const { modelUsed } = await streamChat({
          messages: history.map((m) => ({ role: m.role, content: m.role === 'assistant' ? splitFollowups(m.content).body : m.content })),
          disruptionContext: disruption,
          signal: controller.signal,
          onDelta: (chunk) => patch((m) => ({ ...m, content: m.content + chunk })),
        });
        if (modelUsed) patch((m) => ({ ...m, modelUsed }));
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.error(e);
          setErrorIndex(replyIndex);
          patch((m) => ({ ...m, content: m.content || 'The advisor couldn’t answer. Check that your LLM server is running, then try again.' }));
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [messages, disruption, pin],
  );

  const save = () => {
    upsert({
      sessionId,
      title: disruption?.title ? `Strategy: ${decodeEntities(disruption.title)}` : `Strategy session, ${new Date().toLocaleDateString()}`,
      messages: messages.filter((m, i) => m.content.trim() && i !== errorIndex),
      timestamp: new Date().toISOString(),
      disruptionId: disruption?.id ?? disruptionId ?? null,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const userHasSpoken = messages.some((m) => m.role === 'user');
  const lastIndex = messages.length - 1;
  const firstUserIndex = messages.findIndex((m) => m.role === 'user');
  const action = disruption ? parseImpact(disruption.impact)[0] : undefined;

  return (
    <div className="flex h-[calc(100dvh-var(--topbar-h))] flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-5">
        <Link href="/explore" aria-label="Back to Disruption Radar" className="inline-grid h-9 w-9 place-items-center rounded-full text-label-2 hover:bg-surface-2 hover:text-label">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Strategy Advisor</h1>
          <p className="truncate text-[12px] text-label-3">{disruption ? decodeEntities(disruption.title) : 'Risk mitigation and opportunity planning'}</p>
        </div>
        <Button variant={savedFlash ? 'primary' : 'secondary'} size="sm" onClick={save} disabled={!userHasSpoken || streaming} className="hidden sm:inline-flex">
          {savedFlash ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {savedFlash ? 'Saved' : alreadySaved ? 'Update saved' : 'Save conversation'}
        </Button>
        <IconButton aria-label="Save conversation" onClick={save} disabled={!userHasSpoken || streaming} className="sm:hidden">
          {savedFlash ? <Check className="h-[18px] w-[18px] text-low" /> : <Bookmark className="h-[18px] w-[18px]" />}
        </IconButton>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {disruption && (
            <section aria-label="Signal being discussed" className="mb-10 rounded-card bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <SeverityBadge value={disruption.severity} />
                {disruption.location && (
                  <span className="flex items-center gap-1 text-label-3">
                    <MapPin className="h-3.5 w-3.5" /> {decodeEntities(disruption.location)}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-headline">{decodeEntities(disruption.title)}</h2>
              {action && (
                <p className="mt-2 text-[14px] leading-relaxed text-label-2">
                  {action.label && <span className="text-label-3">{action.label}: </span>}
                  {action.text}
                </p>
              )}
            </section>
          )}

          <div className="space-y-8">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserBubble key={i}>{m.content}</UserBubble>
              ) : (
                <AssistantMessage
                  key={i}
                  content={m.content}
                  error={i === errorIndex}
                  streaming={streaming && i === lastIndex}
                  isLast={i === lastIndex}
                  canAct={!streaming && userHasSpoken}
                  modelUsed={m.modelUsed}
                  hideActions={firstUserIndex === -1 || i < firstUserIndex}
                  onFollowup={send}
                />
              ),
            )}
          </div>

          {!userHasSpoken && (
            <div className="mt-8 flex flex-wrap gap-2 pl-[2.6rem]">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full px-3.5 py-1.5 text-[13px] text-label-2 ring-1 ring-line transition-colors hover:bg-surface hover:text-label">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        onStop={() => abortRef.current?.abort()}
        streaming={streaming}
        placeholder="Ask about impact, risk mitigation or strategy"
      />
    </div>
  );
}

export default function StrategyAdvisorPage() {
  return (
    <Suspense>
      <AdvisorContent />
    </Suspense>
  );
}
