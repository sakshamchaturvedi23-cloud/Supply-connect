// src/app/chat/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowUp, Check, Copy, Menu, MessageSquare, Network, Plus, Radar, RotateCcw,
  ShieldCheck, Sparkles, Square, Trash2, X,
} from 'lucide-react';
import Markdown from '@/components/chat/Markdown';
import ImpactContextCard from '@/components/chat/ImpactContextCard';
import { ImpactAttachment, attachmentToPrompt, clearImpactContext, peekImpactContext } from '@/lib/share-context';

// Survives component remounts, so one shared analysis is never sent twice.
const sentContextIds = new Set<number>();

/* ------------------------------------------------------------------ */
/* Types & storage                                                     */
/* ------------------------------------------------------------------ */

type Role = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  attachment?: ImpactAttachment;
  error?: boolean;
  createdAt: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const STORAGE_KEY = 'supply_ai_sessions_v2';
const NEW_TITLE = 'New conversation';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const newSession = (): ChatSession => ({ id: uid(), title: NEW_TITLE, messages: [], updatedAt: Date.now() });

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    // Drop empty sessions and cap history so localStorage never overflows.
    const keep = sessions.filter((s) => s.messages.length > 0).slice(0, 40);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keep));
  } catch (e) {
    console.error('Could not save chats', e);
  }
}

const makeTitle = (text: string, att?: ImpactAttachment) => {
  if (att) return `Impact plan · ${att.profession}`.slice(0, 48);
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || NEW_TITLE;
};

function relativeTime(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

/* ------------------------------------------------------------------ */
/* <followups> parsing — model appends suggested next questions        */
/* ------------------------------------------------------------------ */

const OPEN_TAG = '<followups>';
const CLOSE_TAG = '</followups>';

function splitFollowups(text: string): { body: string; followups: string[] } {
  const start = text.indexOf(OPEN_TAG);
  if (start === -1) {
    // Hide a half-streamed "<follo" at the very end.
    const lt = text.lastIndexOf('<');
    if (lt !== -1 && text.length - lt < OPEN_TAG.length && OPEN_TAG.startsWith(text.slice(lt))) {
      return { body: text.slice(0, lt), followups: [] };
    }
    return { body: text, followups: [] };
  }
  const body = text.slice(0, start).trimEnd();
  const end = text.indexOf(CLOSE_TAG, start);
  if (end === -1) return { body, followups: [] };
  const inner = text.slice(start + OPEN_TAG.length, end).trim();
  let followups: string[] = [];
  try {
    const parsed = JSON.parse(inner);
    if (Array.isArray(parsed)) followups = parsed.filter((x) => typeof x === 'string');
  } catch {
    followups = inner.split('\n').map((s) => s.replace(/^[-*\d.\s"]+|["\s,]+$/g, '')).filter(Boolean);
  }
  return { body, followups: followups.slice(0, 3) };
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  { title: 'Lithium outlook', prompt: 'What is the 6-month outlook for lithium prices and what drives it?' },
  { title: 'Dual sourcing', prompt: 'How should a small hardware startup set up dual sourcing for critical components?' },
  { title: 'Freight volatility', prompt: 'How can I protect margins against ocean freight rate spikes?' },
  { title: 'Tariff exposure', prompt: 'Give me a quick framework to measure my tariff exposure by supplier country.' },
];

const IMPACT_PROMPT =
  'I have attached my Impact Copilot analysis. Turn it into a prioritized action plan: what should I do this week, this month and this quarter, and which chain is my biggest risk?';

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SupplyAIChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sessionsRef = useRef<ChatSession[]>([]);
  sessionsRef.current = sessions;
  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = useMemo(() => sessions.find((s) => s.id === activeId), [sessions, activeId]);
  const streaming = streamingId !== null;

  /* ---------- state helpers ---------- */

  const updateSession = useCallback((id: string, fn: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  const patchMessage = useCallback(
    (sid: string, mid: string, fn: (m: ChatMessage) => ChatMessage) =>
      updateSession(sid, (s) => ({ ...s, messages: s.messages.map((m) => (m.id === mid ? fn(m) : m)) })),
    [updateSession],
  );

  /* ---------- streaming core ---------- */

  const streamReply = useCallback(
    async (sid: string, history: ChatMessage[]) => {
      const assistantId = uid();
      updateSession(sid, (s) => ({
        ...s,
        updatedAt: Date.now(),
        messages: [...s.messages, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }],
      }));
      setStreamingId(assistantId);
      stickToBottom.current = true;

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
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: payload }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        // Non-streaming backend (e.g. { success, reply, modelUsed }) — parse JSON instead of printing it.
        if ((res.headers.get('content-type') ?? '').includes('application/json')) {
          const data = await res.json();
          const text = [data?.reply, data?.message, data?.content, data?.analysis, data?.choices?.[0]?.message?.content].find(
            (v) => typeof v === 'string' && v.trim(),
          );
          if (!text || data?.success === false) throw new Error(data?.error ?? 'Empty reply');
          patchMessage(sid, assistantId, (m) => ({ ...m, content: text }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) patchMessage(sid, assistantId, (m) => ({ ...m, content: m.content + chunk }));
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.error(e);
          patchMessage(sid, assistantId, (m) => ({
            ...m,
            error: true,
            content: m.content || 'Supply AI could not respond right now. Check your connection and try again.',
          }));
        }
      } finally {
        abortRef.current = null;
        setStreamingId(null);
      }
    },
    [patchMessage, updateSession],
  );

  const send = useCallback(
    (text: string, opts: { sessionId?: string; attachment?: ImpactAttachment } = {}) => {
      const content = text.trim();
      if ((!content && !opts.attachment) || abortRef.current) return;

      const sid = opts.sessionId ?? activeId;
      const existing = sessionsRef.current.find((s) => s.id === sid)?.messages ?? [];
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content,
        attachment: opts.attachment,
        createdAt: Date.now(),
      };

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

  const startNewChat = useCallback(() => {
    const current = sessionsRef.current.find((s) => s.id === activeId);
    if (current && current.messages.length === 0) {
      setSidebarOpen(false);
      textareaRef.current?.focus();
      return current.id;
    }
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setSidebarOpen(false);
    return s.id;
  }, [activeId]);

  const deleteSession = (id: string) => {
    if (streaming && id === activeId) stop();
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) {
        if (next.length) setActiveId(next[0].id);
        else {
          const s = newSession();
          setActiveId(s.id);
          return [s];
        }
      }
      return next;
    });
  };

  /* ---------- effects ---------- */

  // Load history once (guarded: React StrictMode runs mount effects twice in dev).
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const fresh = newSession();
    const list = [fresh, ...loadSessions()];
    setSessions(list);
    sessionsRef.current = list;
    setActiveId(fresh.id);
    setReady(true);
  }, []);

  // Pick up an analysis shared from Impact Copilot — only once its session exists in state.
  useEffect(() => {
    if (!ready || !activeId || abortRef.current) return;
    const pending = peekImpactContext();
    if (!pending || sentContextIds.has(pending.createdAt)) return;
    if (!sessions.some((s) => s.id === activeId)) return;
    sentContextIds.add(pending.createdAt);
    clearImpactContext();
    send(IMPACT_PROMPT, { sessionId: activeId, attachment: pending });
  }, [ready, activeId, sessions, send]);

  // Persist when not mid-stream.
  useEffect(() => {
    if (ready && !streaming) saveSessions(sessions);
  }, [sessions, ready, streaming]);

  // Auto-scroll while the user is near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  // Auto-grow textarea.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const history = useMemo(
    () => sessions.filter((s) => s.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  const messages = active?.messages ?? [];
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  /* ---------- render ---------- */

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Mobile backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-neutral-800/80 bg-neutral-950 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-800 bg-emerald-950 text-[11px] font-black text-emerald-400">
              SC
            </span>
            <span className="text-sm font-bold tracking-wide text-white">Supply Connect AI</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1 text-neutral-500 hover:text-white md:hidden" aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={startNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>

        <nav className="mt-4 flex gap-1.5 px-3">
          <Link href="/explore" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-800 py-1.5 text-[11px] text-neutral-400 hover:border-neutral-700 hover:text-white">
            <Radar className="h-3.5 w-3.5" /> Radar
          </Link>
          <Link href="/impact-copilot" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-800 py-1.5 text-[11px] text-neutral-400 hover:border-neutral-700 hover:text-white">
            <Network className="h-3.5 w-3.5" /> Copilot
          </Link>
        </nav>

        <p className="mt-6 px-5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Recent</p>
        <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {history.length === 0 && <p className="px-3 py-2 text-xs text-neutral-600">No conversations yet.</p>}
          {history.map((s) => {
            const isActive = s.id === activeId;
            return (
              <div
                key={s.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                  isActive ? 'bg-neutral-800/80 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                }`}
              >
                <button
                  onClick={() => {
                    setActiveId(s.id);
                    setSidebarOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  {s.messages.some((m) => m.attachment) ? (
                    <Network className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                  ) : (
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">{s.title}</span>
                    <span className="block text-[10px] text-neutral-600">{relativeTime(s.updatedAt)}</span>
                  </span>
                </button>
                <button
                  onClick={() => deleteSession(s.id)}
                  className="rounded p-1 text-neutral-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800/80 px-5 py-3 text-[11px] text-neutral-500">
          Saved in this browser
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-800/80 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg border border-neutral-800 p-2 text-neutral-300 md:hidden" aria-label="Open sidebar">
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/" className="hidden rounded-lg border border-neutral-800 p-2 text-neutral-300 hover:text-white md:block" aria-label="Back to home">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-emerald-400" /> Supply AI
            </h1>
            <p className="truncate text-[11px] text-neutral-500">{active?.messages.length ? active.title : 'Market, logistics & risk intelligence'}</p>
          </div>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8">
            {ready && messages.length === 0 ? (
              <EmptyState onPick={(p) => send(p)} />
            ) : (
              <div className="space-y-8">
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <UserBubble key={m.id} message={m} />
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      message={m}
                      isStreaming={m.id === streamingId}
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

        {/* Composer */}
        <div className="px-4 pb-4 pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-2 shadow-xl transition focus-within:border-neutral-600"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask Supply AI about markets, logistics or risk…"
              className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-white placeholder:text-neutral-500 focus:outline-none"
            />
            {streaming ? (
              <button type="button" onClick={stop} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-200 text-neutral-950 transition hover:bg-white" aria-label="Stop generating">
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-neutral-950 transition hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </form>
          <p className="mt-2 text-center text-[11px] text-neutral-600">Supply AI can make mistakes. Verify critical numbers before acting.</p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-[8vh] text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-800 bg-emerald-950 text-emerald-400">
        <Sparkles className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold text-white">How can I help today?</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-400">
        Ask about market trends, supplier risk or logistics, or share an analysis from Impact Copilot.
      </p>
      <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => onPick(s.prompt)}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 text-left transition hover:border-neutral-700 hover:bg-neutral-900"
          >
            <p className="text-[13px] font-semibold text-white">{s.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{s.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] flex-col items-end gap-2 sm:max-w-[75%]">
        {message.attachment && (
          <div className="w-full min-w-[280px] sm:w-[400px]">
            <ImpactContextCard attachment={message.attachment} />
          </div>
        )}
        {message.content && (
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-neutral-800 px-4 py-2.5 text-[15px] leading-relaxed text-neutral-100">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantMessage({
  message, isStreaming, isLast, canAct, onRegenerate, onFollowup,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  isLast: boolean;
  canAct: boolean;
  onRegenerate: () => void;
  onFollowup: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { body, followups } = splitFollowups(message.content);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="flex gap-3.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-emerald-800/80 bg-emerald-950 text-emerald-400">
        <Sparkles className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        {isStreaming && !body ? (
          <div className="flex h-7 items-center gap-1">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : message.error ? (
          <p className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">{body}</p>
        ) : (
          <Markdown content={body} />
        )}

        {!isStreaming && body && (
          <div className="mt-3 flex items-center gap-1 text-neutral-500">
            <button onClick={copy} className="rounded-md p-1.5 transition hover:bg-neutral-900 hover:text-white" aria-label="Copy reply">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {isLast && canAct && (
              <button onClick={onRegenerate} className="rounded-md p-1.5 transition hover:bg-neutral-900 hover:text-white" aria-label="Regenerate">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {isLast && canAct && followups.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {followups.map((q) => (
              <button
                key={q}
                onClick={() => onFollowup(q)}
                className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3.5 py-1.5 text-xs text-neutral-300 transition hover:border-emerald-800 hover:text-emerald-300"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


