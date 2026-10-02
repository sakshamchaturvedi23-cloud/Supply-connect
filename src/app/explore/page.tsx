'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, AlertTriangle, ArrowLeft, Globe, ShieldAlert, Loader2, TrendingUp, Cpu, Lightbulb, Bookmark, Network } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function shuffleArray(array: any[]) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function ExploreRadarContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Database states
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 🛡️ Bookmarking State & Logic
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadSavedBookmarks = () => {
      try {
        const stored = localStorage.getItem('supply_connect_bookmarks');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSavedIds(parsed.map((i: any) => i.id));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSavedBookmarks();
  }, []);

  const toggleSaveCard = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem('supply_connect_bookmarks');
      let current: any[] = stored ? JSON.parse(stored) : [];
      
      if (savedIds.includes(item.id)) {
        current = current.filter(i => i.id !== item.id);
        setSavedIds(savedIds.filter(id => id !== item.id));
      } else {
        current.push(item);
        setSavedIds([...savedIds, item.id]);
      }
      localStorage.setItem('supply_connect_bookmarks', JSON.stringify(current));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const getPersonalizedImage = (item: any) => {
    const text = (item.title + ' ' + item.category).toLowerCase();

    if (text.includes('chip') || text.includes('nvidia') || text.includes('semiconductor') || text.includes('processor') || text.includes('tech')) {
      return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('stock') || text.includes('market') || text.includes('inflation') || text.includes('price') || text.includes('spike')) {
      return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('corporate') || text.includes('policy') || text.includes('shift') || text.includes('decision') || text.includes('apple') || text.includes('tesla')) {
      return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
    } else if (text.includes('port') || text.includes('ship') || text.includes('cargo') || text.includes('freight') || text.includes('logistics') || text.includes('boeing')) {
      return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/ingest');
      
      const { data, error } = await supabase
        .from('disruptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setDisruptions(shuffleArray(data));
      }
      
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // 🚀 SINGLE OPTIMIZED INITIAL FETCH & 24-HOUR AUTO-SYNC CHECK
  useEffect(() => {
    async function initializeRadarData() {
      try {
        const lastSync = localStorage.getItem('supply_connect_last_sync');
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (!lastSync || now - parseInt(lastSync, 10) > twentyFourHours) {
          console.log('🔄 24 hours elapsed. Automatically syncing fresh backend telemetry...');
          await fetch('/api/ingest');
          localStorage.setItem('supply_connect_last_sync', now.toString());
        }

        const { data, error } = await supabase
          .from('disruptions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching disruptions from Supabase:', error);
        } else if (data) {
          setDisruptions(shuffleArray(data));
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    initializeRadarData();
  }, []);

  // Highlight target card when returning from Startup Advisor
  useEffect(() => {
    if (highlightId && disruptions.length > 0) {
      const element = document.getElementById(`card-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-emerald-500', 'scale-[1.02]', 'transition-all', 'duration-500');
        
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-emerald-500', 'scale-[1.02]');
        }, 3000);
      }
    }
  }, [highlightId, disruptions]);

  // Pull-to-refresh Gesture Listener
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      if (window.scrollY === 0 && touchY - touchStartY > 360 && !syncing) {
        handleSync();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (window.scrollY === 0 && e.deltaY < -100 && !syncing) {
        handleSync();
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [syncing]);

  // 🎯 STRICT 12-PER-CATEGORY POOL & SHUFFLED 'ALL' MIX
  const filteredDisruptions = useMemo(() => {
    if (!disruptions.length) return [];

    const buckets: { [key: string]: any[] } = {
      'AI Chips & Core Tech Hardware': [],
      'Price Spikes & Raw Material Inflation': [],
      'Corporate Policy & Supply Shifts': [],
      'Logistics & Freight Volatility': []
    };

    const seenIds = new Set();
    const seenTitles = new Set();

    disruptions.forEach(item => {
      if (!item || !item.id || !item.title) return;
      const cleanTitle = item.title.trim().toLowerCase();
      
      if (seenIds.has(item.id) || seenTitles.has(cleanTitle)) return;

      const itemCat = (item.category || '').toLowerCase();
      const titleLower = cleanTitle;

      if (
        (itemCat.includes('ai chips') || itemCat.includes('hardware') || titleLower.includes('chip') || titleLower.includes('semiconductor') || titleLower.includes('nvidia') || titleLower.includes('processor') || titleLower.includes('gpu')) &&
        buckets['AI Chips & Core Tech Hardware'].length < 12
      ) {
        seenIds.add(item.id);
        seenTitles.add(cleanTitle);
        buckets['AI Chips & Core Tech Hardware'].push(item);
      } else if (
        (itemCat.includes('price') || itemCat.includes('inflation') || itemCat.includes('stock') || titleLower.includes('inflation') || titleLower.includes('price') || titleLower.includes('stock') || titleLower.includes('cost') || titleLower.includes('spike')) &&
        buckets['Price Spikes & Raw Material Inflation'].length < 12
      ) {
        seenIds.add(item.id);
        seenTitles.add(cleanTitle);
        buckets['Price Spikes & Raw Material Inflation'].push(item);
      } else if (
        (itemCat.includes('corporate') || itemCat.includes('policy') || itemCat.includes('decision') || titleLower.includes('corporate') || titleLower.includes('policy') || titleLower.includes('merger') || titleLower.includes('acquisition') || titleLower.includes('plant')) &&
        buckets['Corporate Policy & Supply Shifts'].length < 12
      ) {
        seenIds.add(item.id);
        seenTitles.add(cleanTitle);
        buckets['Corporate Policy & Supply Shifts'].push(item);
      } else if (
        buckets['Logistics & Freight Volatility'].length < 12
      ) {
        seenIds.add(item.id);
        seenTitles.add(cleanTitle);
        buckets['Logistics & Freight Volatility'].push(item);
      }
    });

    if (searchTerm) {
      const allPool = [
        ...buckets['AI Chips & Core Tech Hardware'],
        ...buckets['Price Spikes & Raw Material Inflation'],
        ...buckets['Corporate Policy & Supply Shifts'],
        ...buckets['Logistics & Freight Volatility']
      ];
      return allPool.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      let categoryCards = shuffleArray(buckets[selectedCategory] || []);
      if (highlightId) {
        const target = disruptions.find(i => i.id === highlightId);
        if (target && !categoryCards.some(c => c.id === target.id)) {
          categoryCards = [target, ...categoryCards];
        }
      }
      return categoryCards;
    }

    let balancedMix: any[] = [];
    Object.keys(buckets).forEach(cat => {
      const randomizedBucket = shuffleArray(buckets[cat]);
      balancedMix.push(...randomizedBucket.slice(0, 3));
    });

    let finalMix = shuffleArray(balancedMix);

    if (highlightId) {
      const target = disruptions.find(i => i.id === highlightId);
      if (target && !finalMix.some(c => c.id === target.id)) {
        finalMix = [target, ...finalMix];
      }
    }

    return finalMix;
  }, [disruptions, selectedCategory, searchTerm, highlightId, refreshKey]);

  const totalActiveSignals = disruptions.length;
  const criticalRiskCount = disruptions.filter(d => d.severity === 'Critical' || d.severity === 'High').length;
  const topVulnerableSignal = disruptions.length > 0 ? disruptions[0] : null;

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12">
      
      {syncing && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-sm font-semibold text-neutral-200 tracking-wide">
            Syncing live telemetry & shuffling fresh feed...
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-3">
          {/* Naya Impact Copilot Button in Header */}
          <Link href="/impact-copilot" className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 transition-all shadow-sm">
            <Network className="w-3.5 h-3.5 text-emerald-400" /> Impact Copilot
          </Link>

          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-full text-xs text-emerald-400 font-medium">
            <Globe className="w-3.5 h-3.5 animate-pulse" /> Live Telemetry Connected
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Global Disruption & Impact Radar</h1>
          <p className="text-neutral-400 text-sm">Real-time database intelligence tracking macro shifts and local small business impacts.</p>
        </div>

        {/* SECTION 1: LIVE PORTFOLIO RISK & VENTURE GAP ANALYZER */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Live Portfolio Risk & Venture Gap Analyzer</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Feed Metrics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Indexed Risk Signals</span>
                <Globe className="w-4 h-4 text-neutral-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">{totalActiveSignals}</div>
                <p className="text-xs text-neutral-400">Total active multi-channel telemetry points in database pool.</p>
              </div>
            </div>

            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">High / Critical Alerts</span>
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400 mb-1">{criticalRiskCount}</div>
                <p className="text-xs text-neutral-400">Active bottlenecks demanding immediate procurement hedging.</p>
              </div>
            </div>

            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Primary Focus Sector</span>
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400 truncate mb-1">
                  {topVulnerableSignal ? topVulnerableSignal.category : 'Analyzing...'}
                </div>
                <p className="text-xs text-neutral-400 truncate">
                  {topVulnerableSignal ? topVulnerableSignal.title : 'Waiting for telemetry sync...'}
                </p>
              </div>
            </div>
          </div>

          {topVulnerableSignal && (
            <div className="mt-6 bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">Latest Executive & Small Business Impact Directive</h4>
                  <p className="text-xs text-neutral-300">{topVulnerableSignal.impact}</p>
                </div>
              </div>
              <Link href={`/startup-advisor?id=${topVulnerableSignal.id}`} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shrink-0">
                Analyze Impact & Strategy →
              </Link>
            </div>
          )}
        </div>

        {/* SECTION 2: Live Disruption Feed Grid */}
        <div className="space-y-8">
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/60">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Active Global Risk Signals</h2>
                <p className="text-xs text-neutral-400 mt-1">Real-time database intelligence tracking macro shocks and local market ripples.</p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search location or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {[
                'All',
                'AI Chips & Core Tech Hardware',
                'Price Spikes & Raw Material Inflation',
                'Corporate Policy & Supply Shifts',
                'Logistics & Freight Volatility'
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-neutral-950 font-bold shadow-emerald-500/20 shadow-md'
                      : 'bg-neutral-950/80 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-neutral-400">Fetching live telemetry from Supabase database...</p>
            </div>
          ) : filteredDisruptions.length === 0 ? (
            <div className="text-center py-20 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
              <p className="text-sm text-neutral-400">No matching global disruptions found in database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDisruptions.map((item) => (
                <div 
                  key={item.id} 
                  id={`card-${item.id}`}
                  className="bg-neutral-900/80 border border-neutral-800/80 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-neutral-700 transition-all shadow-lg"
                >
                  <div className="h-44 w-full overflow-hidden relative border-b border-neutral-800 bg-neutral-950">
                    <img 
                      src={item.image_url || getPersonalizedImage(item)} 
                      alt={item.title} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                    />
                  </div>

                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-medium">
                          {item.category}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                            item.severity === 'High' || item.severity === 'Critical' 
                              ? 'bg-red-950/60 text-red-400 border border-red-900/50' 
                              : 'bg-amber-950/60 text-amber-400 border border-amber-900/50'
                          }`}>
                            <AlertTriangle className="w-3 h-3" /> {item.severity} Risk
                          </span>

                          <button
                            onClick={(e) => toggleSaveCard(item, e)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              savedIds.includes(item.id)
                                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-white hover:bg-neutral-800'
                            }`}
                            title={savedIds.includes(item.id) ? 'Remove Bookmark' : 'Save Risk Signal'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${savedIds.includes(item.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-neutral-400 mb-2"><strong className="text-neutral-500">Location:</strong> {item.location}</p>
                      <p className="text-sm text-neutral-400 mb-4">{item.description}</p>
                    </div>

                    <div className="border-t border-neutral-800 pt-4 mt-4">
                      <p className="text-xs text-neutral-500 mb-3"><strong className="text-neutral-400">Impact Analysis:</strong> {item.impact}</p>
                      <Link href={`/startup-advisor?id=${item.id}`} className="block text-center w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium transition-colors">
                        Analyze Impact & Strategy →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ExploreRadarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-400"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ExploreRadarContent />
    </Suspense>
  );
}

