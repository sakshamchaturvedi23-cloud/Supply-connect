'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lightbulb, Send, ArrowLeft, Loader2, Bookmark, Check, ShieldAlert, Cpu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Helper to decode HTML entities like &apos;, &amp;, etc.
const decodeHtmlEntities = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

// Helper to clean and format AI markdown response nicely into JSX without raw asterisks
const renderFormattedMessage = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');

  return lines.map((line, idx) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');

    return (
      <div key={idx} className={`${isBullet ? 'pl-4 my-1.5 flex items-start gap-2' : 'my-1.5'}`}>
        {isBullet && <span className="text-emerald-400 font-bold">•</span>}
        <span className="flex-1">
          {parts.map((part, i) => 
            i % 2 === 1 ? (
              <strong key={i} className="font-semibold text-emerald-300">
                {part.replace(/[-*]/g, '').trim()}
              </strong>
            ) : (
              part
            )
          )}
        </span>
      </div>
    );
  });
};

function StartupAdvisorContent() {
  const searchParams = useSearchParams();
  const disruptionId = searchParams.get('id');
  const sessionIdParam = searchParams.get('sessionId');

  const [disruption, setDisruption] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; modelUsed?: string }>>([
    { role: 'assistant', content: 'Hello! I am your AI Supply Chain Intelligence Officer. Let me know which perspective you would like to explore regarding our loaded global telemetry.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false); // 🌊 3-Dot Typing Animation State
  const [savingChat, setSavingChat] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    sessionIdParam || `session_${Date.now()}`
  );

  // Fetch disruption details if launched from a card
  useEffect(() => {
    const fetchContext = async () => {
      if (disruptionId) {
        try {
          const { data, error } = await supabase
            .from('disruptions')
            .select('*')
            .eq('id', disruptionId)
            .single();

          if (data) {
            setDisruption(data);
            const cleanTitle = decodeHtmlEntities(data.title);
            const contextContent = `I see you are analyzing: "${cleanTitle}" located in ${data.location} (${data.category}). How would you like to capitalize on this disruption or mitigate its supply chain impact?`;

            // Prevent duplicate message injection on React strict mode re-mounts
            setMessages(prev => {
              if (prev.some(m => m.content.includes(cleanTitle))) return prev;
              return [
                ...prev,
                { role: 'assistant', content: contextContent }
              ];
            });
          }
        } catch (err) {
          console.error('Error fetching context:', err);
        }
      }

      // If resuming a saved session from URL
      if (sessionIdParam) {
        try {
          const storedChats = localStorage.getItem('supply_connect_chats');
          if (storedChats) {
            const chats = JSON.parse(storedChats);
            const targetChat = chats.find((c: any) => c.sessionId === sessionIdParam);
            if (targetChat && targetChat.messages) {
              setMessages(targetChat.messages);
            }
          }
        } catch (e) {
          console.error('Error loading session:', e);
        }
      }

      setLoading(false);
    };

    fetchContext();
  }, [disruptionId, sessionIdParam]);

  // 🤖 Real LLM API Integration with FreeLLMAPI router & Typing Indicator
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    const newMessages = [...messages, { role: 'user' as const, content: userText }];
    setMessages(newMessages);
    setInputMessage('');
    setIsTyping(true); // Start waving 3 dots loader

    try {
      const formattedForApi = newMessages.map(m => ({
        sender: m.role,
        text: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedForApi,
          disruptionContext: disruption
        }),
      });

      const data = await response.json();

      if (data.success && data.reply) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply, 
          modelUsed: data.modelUsed 
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Failed to fetch response from FreeLLMAPI router.' }]);
      }
    } catch (err) {
      console.error('LLM connection error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, connection error with local FreeLLMAPI router.' }]);
    } finally {
      setIsTyping(false); // Stop waving 3 dots loader
    }
  };

  // 💾 Save Conversation Handler
  const handleSaveConversation = () => {
    setSavingChat(true);
    try {
      const stored = localStorage.getItem('supply_connect_chats');
      let chats: any[] = stored ? JSON.parse(stored) : [];

      const chatTitle = disruption?.title ? `Strategy: ${decodeHtmlEntities(disruption.title)}` : `Consultation Session (${new Date().toLocaleDateString()})`;

      const chatPayload = {
        sessionId: currentSessionId,
        title: chatTitle,
        messages: messages,
        timestamp: new Date().toISOString(),
        disruptionId: disruptionId || null
      };

      const existingIndex = chats.findIndex(c => c.sessionId === currentSessionId);
      if (existingIndex >= 0) {
        chats[existingIndex] = chatPayload;
      } else {
        chats.unshift(chatPayload);
      }

      localStorage.setItem('supply_connect_chats', JSON.stringify(chats));
      window.dispatchEvent(new Event('storage'));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error('Error saving chat:', e);
    } finally {
      setSavingChat(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 selection:bg-emerald-500 selection:text-neutral-950 flex flex-col overflow-hidden">
      
      {/* Background Atmospheric Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Header Bar with Glassmorphism */}
      <div className="sticky top-0 z-30 border-b border-neutral-800/80 bg-neutral-900/70 backdrop-blur-2xl px-4 sm:px-8 py-4 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/explore" className="p-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-400 animate-pulse" /> Supply Chain & Strategy Advisor
              </h1>
              <p className="text-[11px] sm:text-xs text-neutral-400">Interactive market analysis, risk mitigation, and strategic decision support.</p>
            </div>
          </div>

          {/* Save Conversation Button */}
          <button
            onClick={handleSaveConversation}
            disabled={savingChat}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg ${
              savedSuccess 
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-emerald-500/20' 
                : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/80'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Saved to History!
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-emerald-400" /> Save Conversation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="max-w-5xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col justify-between space-y-6 z-10">
        
        {/* Context Banner if Disruption attached */}
        {disruption && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-900/90 via-neutral-900/95 to-neutral-900/90 border border-neutral-800/90 shadow-2xl backdrop-blur-xl flex items-start gap-3.5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-emerald-500" />
            <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="text-neutral-400 font-semibold uppercase tracking-wider text-[10px] bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/50">Active Context Signal</span>
              <h3 className="text-white font-bold text-sm mt-1">{decodeHtmlEntities(disruption.title)}</h3>
              <p className="text-neutral-300 mt-1 leading-relaxed">{decodeHtmlEntities(disruption.impact)}</p>
            </div>
          </div>
        )}

        {/* Chat Messages Container with Visible Scroll Tube */}
        <div className="flex-1 space-y-5 overflow-y-auto max-h-[52vh] pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-900/40 [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-600">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-2xl rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-xl ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-br-sm shadow-emerald-900/20' 
                  : 'bg-neutral-900/90 border border-neutral-800/90 text-neutral-200 rounded-bl-sm backdrop-blur-md'
              }`}>
                {msg.role === 'user' ? msg.content : renderFormattedMessage(msg.content)}
              </div>
              {msg.modelUsed && (
                <span className="text-[10px] text-neutral-500 mt-1.5 px-1.5 flex items-center gap-1 font-mono tracking-wide bg-neutral-900/50 rounded-md border border-neutral-800/50">
                  <Cpu className="w-3 h-3 text-emerald-400" /> Model: {msg.modelUsed}
                </span>
              )}
            </div>
          ))}

          {/* 🌊 3-Dot Waving Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start animate-fade-in">
              <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl rounded-bl-sm p-4 flex items-center gap-2 shadow-xl backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce"></span>
              </div>
              <span className="text-[10px] text-neutral-500 mt-1.5 px-1.5 font-mono tracking-wide">
                AI is generating strategy...
              </span>
            </div>
          )}
        </div>

        {/* Floating Prompt Input Form */}
        <form onSubmit={handleSendMessage} className="relative mt-auto pt-4">
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl flex items-center gap-2 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
            <input
              type="text"
              placeholder="Type 'hi' or ask about market impact, risk mitigation, or strategy..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="w-full bg-transparent border-none px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none placeholder:text-neutral-500"
            />
            <button
              type="submit"
              disabled={isTyping}
              className={`p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0 font-bold ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function StartupAdvisorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-400"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <StartupAdvisorContent />
    </Suspense>
  );
}
