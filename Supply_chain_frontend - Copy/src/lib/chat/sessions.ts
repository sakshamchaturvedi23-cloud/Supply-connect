import type { ImpactAttachment } from '@/lib/share-context';
import { uid } from '@/lib/text';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachment?: ImpactAttachment;
  error?: boolean;
  modelUsed?: string;
  createdAt: number;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

const KEY = 'supply_ai_sessions_v2';
export const NEW_TITLE = 'New conversation';

export const newSession = (): ChatSession => ({ id: uid(), title: NEW_TITLE, messages: [], updatedAt: Date.now() });

export function loadSessions(): ChatSession[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as ChatSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  try {
    // Drop empty sessions and cap history so localStorage never overflows.
    localStorage.setItem(KEY, JSON.stringify(sessions.filter((s) => s.messages.length > 0).slice(0, 40)));
  } catch (e) {
    console.error('Could not save chats', e);
  }
}

export function makeTitle(text: string, att?: ImpactAttachment) {
  if (att) return `Impact plan: ${att.profession}`.slice(0, 48);
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 42 ? `${t.slice(0, 42)}…` : t || NEW_TITLE;
}
