'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Radar, Network, Menu, X, Bookmark, Trash2, MessageSquare } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'chats'>('signals');
  
  // Saved states from localStorage
  const [savedSignals, setSavedSignals] = useState<any[]>([]);
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedSignals = localStorage.getItem('supply_connect_bookmarks');
        if (storedSignals) setSavedSignals(JSON.parse(storedSignals));

        const storedChats = localStorage.getItem('supply_connect_chats');
        if (storedChats) setSavedChats(JSON.parse(storedChats));
      } catch (e) {
        console.error('Error loading storage data', e);
      }
    };

    loadStoredData();
    window.addEventListener('storage', loadStoredData);
    const interval = setInterval(loadStoredData, 1000);

    return () => {
      window.removeEventListener('storage', loadStoredData);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBookmarkOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeSignal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSignals.filter(item => item.id !== id);
    setSavedSignals(updated);
    localStorage.setItem('supply_connect_bookmarks', JSON.stringify(updated));
  };

  const removeChat = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedChats.filter(chat => chat.sessionId !== sessionId);
    setSavedChats(updated);
    localStorage.setItem('supply_connect_chats', JSON.stringify(updated));
  };

  const navLinks = [
    { href: '/', label: 'Home', pillar: 'Pillar 1: Command Center', icon: Home },
    { href: '/explore', label: 'Disruption Radar', pillar: 'Pillar 2: Live Radar & Simulator', icon: Radar },
    { href: '/impact-copilot', label: 'Impact Copilot', pillar: 'Pillar 3: Impact Copilot Engine', icon: Network },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">
        
        {/* Left: Brand */}
        <div className="flex items-center justify-start">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold group-hover:border-emerald-400 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
              SC
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base sm:text-lg flex items-center gap-1 font-mono">
                SUPPLY<span className="text-emerald-400">CONNECT</span>
              </span>
              <span className="block text-[9px] text-neutral-400 tracking-wider uppercase font-semibold -mt-0.5">
                3-Pillar Supply Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Pills (Dead Center via Grid Column 2) */}
        <div className="hidden md:flex items-center justify-center">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 ${
                    active
                      ? 'bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700/80 text-emerald-400'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-neutral-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: Bookmarks & Mobile Menu */}
        <div className="flex items-center justify-end gap-3 relative" ref={dropdownRef}>
          
          <button
            onClick={() => setBookmarkOpen(!bookmarkOpen)}
            className="relative p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Saved Bookmarks & Chats"
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            {(savedSignals.length > 0 || savedChats.length > 0) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center">
                {savedSignals.length + savedChats.length}
              </span>
            )}
          </button>

          {/* Bookmark & Chat History Dropdown */}
          {bookmarkOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-2">
                <button
                  onClick={() => setActiveTab('signals')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === 'signals' ? 'bg-neutral-800 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Saved Risk Signals ({savedSignals.length})
                </button>
                <button
                  onClick={() => setActiveTab('chats')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === 'chats' ? 'bg-neutral-800 text-emerald-400 shadow-sm' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Saved AI Chats ({savedChats.length})
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-3 space-y-2">
                {activeTab === 'signals' ? (
                  savedSignals.length === 0 ? (
                    <div className="text-center py-8 text-xs text-neutral-500">
                      No saved risk signals yet.
                    </div>
                  ) : (
                    savedSignals.map((signal) => (
                      <div 
                        key={signal.id}
                        onClick={() => {
                          setBookmarkOpen(false);
                          window.location.href = `/explore?highlight=${signal.id}`;
                        }}
                        className="group p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-emerald-500/50 transition-all cursor-pointer flex items-start justify-between gap-3"
                      >
                        <div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium">
                            {signal.category}
                          </span>
                          <h4 className="text-xs font-semibold text-white mt-1.5 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                            {signal.title}
                          </h4>
                        </div>
                        <button
                          onClick={(e) => removeSignal(signal.id, e)}
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  savedChats.length === 0 ? (
                    <div className="text-center py-8 text-xs text-neutral-500">
                      No saved conversations yet.
                    </div>
                  ) : (
                    savedChats.map((chat) => (
                      <div 
                        key={chat.sessionId}
                        onClick={() => {
                          setBookmarkOpen(false);
                          window.location.href = `/impact-copilot?sessionId=${chat.sessionId}`;
                        }}
                        className="group p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {chat.title || 'Impact Flow'}
                            </h4>
                          </div>
                        </div>
                        <button
                          onClick={(e) => removeChat(chat.sessionId, e)}
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="md:hidden p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-neutral-800/80 space-y-1.5">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-neutral-800 text-white font-semibold border border-neutral-700 text-emerald-400'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-neutral-500'}`} />
                  <span>{link.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}


