'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface SavedDisruption {
  id: string;
  title: string;
  category: string;
  severity: string;
  location: string;
  description: string;
  impact?: string;
  image_url?: string;
  savedAt: string;
}

export interface ChatMessage {
  sender: 'ai' | 'user' | string;
  text: string;
  timestamp?: string;
}

export interface SavedConversation {
  id: string;
  title: string;
  disruptionId?: string | null;
  disruptionTitle?: string | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DisruptionInput {
  id: string | number;
  title?: string;
  category?: string;
  severity?: string;
  location?: string;
  description?: string;
  impact?: string;
  image_url?: string;
}

interface BookmarkContextType {
  savedDisruptions: SavedDisruption[];
  savedConversations: SavedConversation[];
  isDisruptionSaved: (id: string | number) => boolean;
  toggleSaveDisruption: (item: DisruptionInput) => boolean;
  removeDisruption: (id: string | number) => void;
  saveConversation: (session: {
    id?: string;
    title?: string;
    disruptionId?: string | null;
    disruptionTitle?: string | null;
    messages: ChatMessage[];
  }) => string;
  deleteConversation: (id: string) => void;
  getConversation: (id: string) => SavedConversation | undefined;
  totalSavedCount: number;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const DISRUPTIONS_STORAGE_KEY = 'supply_connect_saved_disruptions';
const CONVERSATIONS_STORAGE_KEY = 'supply_connect_saved_conversations';

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [savedDisruptions, setSavedDisruptions] = useState<SavedDisruption[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(DISRUPTIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DISRUPTIONS_STORAGE_KEY && e.newValue) {
        try {
          setSavedDisruptions(JSON.parse(e.newValue));
        } catch {
          // Ignore
        }
      }
      if (e.key === CONVERSATIONS_STORAGE_KEY && e.newValue) {
        try {
          setSavedConversations(JSON.parse(e.newValue));
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const persistDisruptions = useCallback((items: SavedDisruption[]) => {
    setSavedDisruptions(items);
    try {
      localStorage.setItem(DISRUPTIONS_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[Bookmarks] Failed to save disruptions:', e);
    }
  }, []);

  const persistConversations = useCallback((conversations: SavedConversation[]) => {
    setSavedConversations(conversations);
    try {
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('[Bookmarks] Failed to save conversations:', e);
    }
  }, []);

  const isDisruptionSaved = useCallback(
    (id: string | number) => {
      return savedDisruptions.some((item) => String(item.id) === String(id));
    },
    [savedDisruptions]
  );

  const toggleSaveDisruption = useCallback(
    (item: DisruptionInput): boolean => {
      if (!item || item.id === undefined || item.id === null) return false;
      const itemId = String(item.id);
      const exists = savedDisruptions.some((d) => String(d.id) === itemId);

      if (exists) {
        const filtered = savedDisruptions.filter((d) => String(d.id) !== itemId);
        persistDisruptions(filtered);
        return false;
      } else {
        const newSavedItem: SavedDisruption = {
          id: itemId,
          title: item.title || 'Untitled Risk Signal',
          category: item.category || 'General',
          severity: item.severity || 'Medium',
          location: item.location || 'Global',
          description: item.description || '',
          impact: item.impact || '',
          image_url: item.image_url || undefined,
          savedAt: new Date().toISOString()
        };
        const updated = [newSavedItem, ...savedDisruptions];
        persistDisruptions(updated);
        return true;
      }
    },
    [savedDisruptions, persistDisruptions]
  );

  const removeDisruption = useCallback(
    (id: string | number) => {
      const filtered = savedDisruptions.filter((d) => String(d.id) !== String(id));
      persistDisruptions(filtered);
    },
    [savedDisruptions, persistDisruptions]
  );

  const saveConversation = useCallback(
    (session: {
      id?: string;
      title?: string;
      disruptionId?: string | null;
      disruptionTitle?: string | null;
      messages: ChatMessage[];
    }): string => {
      const now = new Date().toISOString();
      let derivedTitle = session.title;

      if (!derivedTitle) {
        if (session.disruptionTitle) {
          derivedTitle = `Strategy: ${session.disruptionTitle}`;
        } else {
          const firstUserMsg = session.messages.find((m) => m.sender === 'user');
          if (firstUserMsg && firstUserMsg.text) {
            derivedTitle =
              firstUserMsg.text.length > 40
                ? `${firstUserMsg.text.slice(0, 37)}...`
                : firstUserMsg.text;
          } else {
            derivedTitle = `AI Strategy Discussion (${new Date().toLocaleDateString()})`;
          }
        }
      }

      if (session.id) {
        const existingIdx = savedConversations.findIndex((c) => c.id === session.id);
        if (existingIdx !== -1) {
          const updated = [...savedConversations];
          updated[existingIdx] = {
            ...updated[existingIdx],
            title: derivedTitle,
            disruptionId: session.disruptionId !== undefined ? session.disruptionId : updated[existingIdx].disruptionId,
            disruptionTitle: session.disruptionTitle !== undefined ? session.disruptionTitle : updated[existingIdx].disruptionTitle,
            messages: session.messages,
            updatedAt: now
          };
          persistConversations(updated);
          return session.id;
        }
      }

      const newId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newConv: SavedConversation = {
        id: newId,
        title: derivedTitle,
        disruptionId: session.disruptionId || null,
        disruptionTitle: session.disruptionTitle || null,
        messages: session.messages,
        createdAt: now,
        updatedAt: now
      };

      const updated = [newConv, ...savedConversations];
      persistConversations(updated);
      return newId;
    },
    [savedConversations, persistConversations]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      const filtered = savedConversations.filter((c) => c.id !== id);
      persistConversations(filtered);
    },
    [savedConversations, persistConversations]
  );

  const getConversation = useCallback(
    (id: string): SavedConversation | undefined => {
      return savedConversations.find((c) => c.id === id);
    },
    [savedConversations]
  );

  const totalSavedCount = savedDisruptions.length + savedConversations.length;

  return (
    <BookmarkContext.Provider
      value={{
        savedDisruptions,
        savedConversations,
        isDisruptionSaved,
        toggleSaveDisruption,
        removeDisruption,
        saveConversation,
        deleteConversation,
        getConversation,
        totalSavedCount
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}
