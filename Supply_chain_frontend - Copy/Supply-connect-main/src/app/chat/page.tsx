'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { History, MessageSquare, Network, Plus, Sparkles, Trash2, X } from 'lucide-react';
import ImpactContextCard from '@/components/chat/ImpactContextCard';
import { AssistantMessage, UserBubble } from '@/components/chat/Messages';
import { Composer } from '@/components/chat/Composer';
import { Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { ImpactAttachment, attachmentToPrompt, clearImpactContext, peekImpactContext } from '@/lib/share-context';
import { ChatMessage, ChatSession, loadSessions, makeTitle, newSession, saveSessions } from '@/lib/chat/sessions';
import { splitFollowups, streamChat } from '@/lib/chat/stream';
import { useAutoScroll } from '@/lib/chat/useAutoScroll';
import { relativeTime, uid } from '@/lib/text';

const SUGGESTIONS = [
  { title: 'Lithium outlook', prompt: 'What is the 6-month outlook for lithium prices and what drives it?' },
  { title: 'Dual sourcing', prompt: 'How should a small hardware startup set up dual sourcing for critical components?' },
  { title: 'Freight volatility', prompt: 'How can I protect margins against ocean freight rate spikes?' },
  { title: 'Tariff exposure', prompt: 'Give me a quick framework to measure my tariff exposure by supplier country.' },
];

const IMPACT_PROMPT =
  'I have attached my Impact Copilot analysis. Turn it into a prioritized action plan: what should I do this week, this month and this quarter, and which chain is my biggest risk?';

// Survive remounts (React StrictMode in dev) so a handoff is never sent twice.
const handledHandoffs = new Set<string>();

function ChatContent() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().get('query');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState('');
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sessionsRef = useRef<ChatSession[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const active = sessions.find((s) => s.id === activeId);
  const messages = useMemo(() => active?.messages ?? [], [active]);
  const streaming = streamingId !== null;
  const { ref: scrollRef, onScroll, pin } = useAutoScroll<HTMLDivElement>(messages.length ? messages : null);

  /* ---------- state helpers ---------- */

  const updateSession = useCallback((id: string, fn: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  const patchMessage = useCallback(
    (sid: string, mid: string, fn: (m: ChatMessage) => ChatMessage) =>
      updateSession(sid, (s) => ({ ...s, messages: s.messages.map((m) => (m.id === mid ? fn(m) : m)) })),
    [updateSession],
  );

  /* ---------- streaming ---------- */

  const streamReply = useCallback(
    async (sid: string, history: ChatMessage[]) => {
      const assistantId = uid();
      updateSession(sid, (s) => ({
        ...s,
        updatedAt: Date.now(),
        messages: [...s.messages, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }],
      }));
      setStreamingId(assistantId);
      pin();

      const controller = new AbortController();
      abortRef.current = controller;

      const payload = history
        .filter((m) => !m.error && (m.content.trim() || m.attachment))
        .slice(-20)
        .map((m) => ({
          role: m.role,
          content:
            m.role === 'assistant'
              ? splitFollowups(m.content).body
              : m.attachment
                ? `${attachmentToPrompt(m.attachment)}\n\n${m.content}`
                : m.content,
        }));

      try {
        const { modelUsed } = await streamChat({
          messages: payload,
          signal: controller.signal,
          onDelta: (chunk) => patchMessage(sid, assistantId, (m) => ({ ...m, content: m.content + chunk })),
        });
        if (modelUsed) patchMessage(sid, assistantId, (m) => ({ ...m, modelUsed }));
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.error(e);
          patchMessage(sid, assistantId, (m) => ({
            ...m,
            error: true,
            content: m.content || 'Supply AI couldn’t answer. Check that your LLM server is running, then try again.',
          }));
        }
      } finally {
        abortRef.current = null;
        setStreamingId(null);
      }
    },
    [patchMessage, pin, updateSession],
  );

  const send = useCallback(
    (text: string, opts: { sessionId?: string; attachment?: ImpactAttachment } = {}) => {
      const content = text.trim();
      if ((!content && !opts.attachment) || abortRef.current) return;
      const sid = opts.sessionId ?? activeId;
      const existing = sessionsRef.current.find((s) => s.id === sid)?.messages ?? [];
      const userMsg: ChatMessage = { id: uid(), role: 'user', content, attachment: opts.attachment, createdAt: Date.now() };

      updateSession(sid, (s) => ({
        ...s,
        title: s.messages.length === 0 ? makeTitle(content, opts.attachment) : s.title,
        updatedAt: Date.now(),
        messages: [...s.messages, userMsg],
      }));
      setInput('');
      streamReply(sid, [...existing, userMsg]);
    },
    [activeId, streamReply, updateSession],
  );

  const stop = () => abortRef.current?.abort();

  const regenerate = () => {
    if (!active || streaming) return;
    const lastUser = active.messages.map((m) => m.role).lastIndexOf('user');
    if (lastUser === -1) return;
    const history = active.messages.slice(0, lastUser + 1);
    updateSession(active.id, (s) => ({ ...s, messages: history }));
    streamReply(active.id, history);
  };

  /* ---------- sessions ---------- */

  const startNewChat = () => {
    setHistoryOpen(false);
    if (active && active.messages.length === 0) {
      composerRef.current?.focus();
      return;
    }
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  };

  const deleteSession = (id: string) => {
    if (streaming && id === activeId) stop();
    const next = sessions.filter((s) => s.id !== id);
    if (id !== activeId) return setSessions(next);
    const fallback = next[0] ?? newSession();
    setSessions(next.length ? next : [fallback]);
    setActiveId(fallback.id);
  };

  /* ---------- effects ---------- */

  // Load history once (guarded against the StrictMode double-run).
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const fresh = newSession();
    const list = [fresh, ...loadSessions()];
    sessionsRef.current = list;
    setSessions(list);
    setActiveId(fresh.id);
    setReady(true);
  }, []);

  // Handoffs: an analysis shared from Impact Copilot, or a question asked on the Overview page.
  useEffect(() => {
    if (!ready || !activeId || abortRef.current || !sessions.some((s) => s.id === activeId)) return;

    const pending = peekImpactContext();
    if (pending && !handledHandoffs.has(`ctx:${pending.createdAt}`)) {
      handledHandoffs.add(`ctx:${pending.createdAt}`);
      clearImpactContext();
      send(IMPACT_PROMPT, { sessionId: activeId, attachment: pending });
      return;
    }

    if (query && !handledHandoffs.has(`q:${query}`)) {
      handledHandoffs.add(`q:${query}`);
      router.replace(pathname, { scroll: false }); // a refresh must not ask again
      send(query, { sessionId: activeId });
    }
  }, [ready, activeId, sessions, send, query, router, pathname]);

  // Persist when not mid-stream.
  useEffect(() => {
    if (ready && !streaming) saveSessions(sessions);
  }, [sessions, ready, streaming]);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const history = useMemo(
    () => sessions.filter((s) => s.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  /* ---------- render ---------- */

  const historyList = (
    <>
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="text-[13px] font-medium text-label-2">Conversations</h2>
        <IconButton aria-label="Close conversations" onClick={() => setHistoryOpen(false)} className="lg:hidden">
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="px-3">
        <Button onClick={startNewChat} size="sm" className="w-full">
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>
      <ul className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {history.length === 0 && <li className="px-3 py-2 text-[13px] text-label-3">Your conversations will appear here.</li>}
        {history.map((s) => {
          const isActive = s.id === activeId;
          const Icon = s.messages.some((m) => m.attachment) ? Network : MessageSquare;
          return (
            <li key={s.id} className={cn('group flex items-center gap-1 rounded-xl pr-1', isActive ? 'bg-surface-2' : 'hover:bg-surface')}>
              <button
                onClick={() => {
                  setActiveId(s.id);
                  setHistoryOpen(false);
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-label-3')} />
                <span className="min-w-0">
                  <span className={cn('block truncate text-[13px]', isActive ? 'text-label' : 'text-label-2')}>{s.title}</span>
                  <span className="block text-[11px] text-label-3">{relativeTime(s.updatedAt)}</span>
                </span>
              </button>
              <IconButton aria-label="Delete conversation" onClick={() => deleteSession(s.id)} className="h-7 w-7 opacity-0 hover:text-critical group-hover:opacity-100 focus-visible:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-var(--topbar-h))]">
      {/* Conversation list */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line lg:flex">{historyList}</aside>
      {historyOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setHistoryOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col bg-canvas shadow-2xl">{historyList}</aside>
        </div>
      )}

      {/* Thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 sm:px-6 md:pr-20">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Supply AI</h1>
            <p className="truncate text-[12px] text-label-3">{active?.messages.length ? active.title : 'Markets, logistics and supplier risk'}</p>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <IconButton aria-label="New chat" onClick={startNewChat}>
              <Plus className="h-[18px] w-[18px]" />
            </IconButton>
            <IconButton aria-label="Show conversations" onClick={() => setHistoryOpen(true)}>
              <History className="h-[18px] w-[18px]" />
            </IconButton>
          </div>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            {ready && messages.length === 0 ? (
              <div className="flex flex-col items-center pt-[8vh] text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
                  <Sparkles className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-title-1">How can I help?</h2>
                <p className="mt-2 max-w-md text-body text-label-2">
                  Ask about market trends, supplier risk or logistics, or share an analysis from Impact Copilot.
                </p>
                <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.title} onClick={() => send(s.prompt)} className="rounded-2xl bg-surface p-4 text-left transition-colors hover:bg-surface-2">
                      <p className="text-[14px] font-medium text-label">{s.title}</p>
                      <p className="mt-1 line-clamp-2 text-[13px] text-label-3">{s.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <UserBubble
                      key={m.id}
                      attachment={
                        m.attachment && (
                          <div className="w-full min-w-[280px] sm:w-[400px]">
                            <ImpactContextCard attachment={m.attachment} />
                          </div>
                        )
                      }
                    >
                      {m.content}
                    </UserBubble>
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      content={m.content}
                      error={m.error}
                      streaming={m.id === streamingId}
                      isLast={m.id === lastAssistantId}
                      canAct={!streaming}
                      onRegenerate={regenerate}
                      onFollowup={(q) => send(q)}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <Composer
          ref={composerRef}
          value={input}
          onChange={setInput}
          onSend={() => send(input)}
          onStop={stop}
          streaming={streaming}
          placeholder="Ask Supply AI about markets, logistics or risk"
          footnote="Supply AI can make mistakes. Check critical numbers before acting."
        />
      </div>
    </div>
  );
}

export default function SupplyAIPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
