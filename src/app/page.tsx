'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ArrowRight, Sparkles, Lightbulb } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('Ask Supply AI (e.g., What is the risk status of semiconductor imports?)');


  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/chat?query=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-emerald-500 selection:text-neutral-950 flex flex-col">
      {/* 3-Pillar Smart Trim Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden flex-1">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI-Based Disruption Detection & Impact Analysis
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Anticipate Supply Chain Disruptions <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">Before They Hit.</span>
          </h1>

          <p className="text-base md:text-lg text-neutral-400 mb-10 max-w-2xl mx-auto">
            Real-time AI early warning, impact analysis, and decision support for modern businesses navigating global supply volatility.
          </p>

          {/* 3-Pillar Clean CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/explore" className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              <span>Explore Disruption Radar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/impact-copilot" className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <span>Launch Impact Copilot</span>
            </Link>
          </div>

        {/* Non-editable Action Prompt Box */}
<div className="max-w-2xl mx-auto bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
  <div className="flex items-center gap-3 pl-2 min-w-0">
    <div className="text-emerald-400 shrink-0">
      <Sparkles className="w-5 h-5" />
    </div>
    <span className="text-sm text-neutral-200 truncate select-none">
      Ask Supply AI (e.g., What is the risk status of semiconductor imports?)
    </span>
  </div>
  <button
  onClick={() => {
    const presetQuery = "What is the risk status of semiconductor imports?";
    window.location.href = `/chat?query=${encodeURIComponent(presetQuery)}`;
  }}
  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer"
>
  Ask AI
</button>

</div>


          {/* 3-Pillar Architecture Quick Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto mt-14 text-left">
            <Link href="/" className="p-3.5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 hover:border-emerald-500/30 transition-all">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">Pillar 1</span>
              <span className="text-xs font-bold text-white block mt-0.5">Command Center</span>
              <span className="text-[11px] text-neutral-400">Executive metrics & AI copilot</span>
            </Link>

            <Link href="/explore" className="p-3.5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 hover:border-emerald-500/30 transition-all">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">Pillar 2</span>
              <span className="text-xs font-bold text-white block mt-0.5">Disruption Radar</span>
              <span className="text-[11px] text-neutral-400">Live signals & What-If simulator</span>
            </Link>

            <Link href="/impact-copilot" className="p-3.5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 hover:border-emerald-500/30 transition-all">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">Pillar 3</span>
              <span className="text-xs font-bold text-white block mt-0.5">Impact Copilot</span>
              <span className="text-[11px] text-neutral-400">Domain flowcharts & playbooks</span>
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}

