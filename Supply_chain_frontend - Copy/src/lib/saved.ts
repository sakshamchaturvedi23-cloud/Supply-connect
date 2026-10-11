'use client';

import { useCallback } from 'react';
import { STORAGE_KEYS, readJSON, useStoredValue, writeJSON } from '@/lib/storage';
import type { Disruption } from '@/lib/disruptions';

/* ------------------------------------------------------------------ */
/* Saved risk signals (bookmarks)                                      */
/* ------------------------------------------------------------------ */

export type SavedSignal = Disruption & { savedAt?: string };

const NO_SIGNALS: SavedSignal[] = [];

export function useSavedSignals() {
  const signals = useStoredValue<SavedSignal[]>(STORAGE_KEYS.savedSignals, NO_SIGNALS);

  const isSaved = useCallback((id: string) => signals.some((s) => String(s.id) === String(id)), [signals]);

  const toggle = useCallback((item: Disruption) => {
    const current = readJSON<SavedSignal[]>(STORAGE_KEYS.savedSignals, NO_SIGNALS);
    const exists = current.some((s) => String(s.id) === String(item.id));
    writeJSON(
      STORAGE_KEYS.savedSignals,
      exists ? current.filter((s) => String(s.id) !== String(item.id)) : [{ ...item, savedAt: new Date().toISOString() }, ...current],
    );
    return !exists;
  }, []);

  const remove = useCallback((id: string) => {
    const current = readJSON<SavedSignal[]>(STORAGE_KEYS.savedSignals, NO_SIGNALS);
    writeJSON(STORAGE_KEYS.savedSignals, current.filter((s) => String(s.id) !== String(id)));
  }, []);

  return { signals, isSaved, toggle, remove };
}

/* ------------------------------------------------------------------ */
/* Saved Strategy Advisor conversations                                */
/* ------------------------------------------------------------------ */

export type AdvisorMessage = { role: 'user' | 'assistant'; content: string; modelUsed?: string };

export type SavedAdvisorChat = {
  sessionId: string;
  title: string;
  messages: AdvisorMessage[];
  timestamp: string;
  disruptionId: string | null;
};

const NO_CHATS: SavedAdvisorChat[] = [];

/** Direct read (safe inside effects, before the store has hydrated). */
export function readAdvisorChat(sessionId: string): SavedAdvisorChat | undefined {
  return readJSON<SavedAdvisorChat[]>(STORAGE_KEYS.advisorChats, NO_CHATS).find((c) => c.sessionId === sessionId);
}

export function useAdvisorChats() {
  const chats = useStoredValue<SavedAdvisorChat[]>(STORAGE_KEYS.advisorChats, NO_CHATS);

  const upsert = useCallback((chat: SavedAdvisorChat) => {
    const current = readJSON<SavedAdvisorChat[]>(STORAGE_KEYS.advisorChats, NO_CHATS);
    const rest = current.filter((c) => c.sessionId !== chat.sessionId);
    writeJSON(STORAGE_KEYS.advisorChats, [chat, ...rest]);
  }, []);

  const remove = useCallback((sessionId: string) => {
    const current = readJSON<SavedAdvisorChat[]>(STORAGE_KEYS.advisorChats, NO_CHATS);
    writeJSON(STORAGE_KEYS.advisorChats, current.filter((c) => c.sessionId !== sessionId));
  }, []);

  const get = useCallback((sessionId: string) => chats.find((c) => c.sessionId === sessionId), [chats]);

  return { chats, upsert, remove, get };
}
