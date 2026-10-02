'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function SimulatePage() {
  const [industry, setIndustry] = useState('Electronics');
  const [component, setComponent] = useState('Semiconductors');
  const [duration, setDuration] = useState(7);

  const getRiskLevel = () => {
    if (duration >= 14) return { level: 'CRITICAL', color: 'text-red-400 bg-red-950/40 border-red-900/60' };
    if (duration >= 7) return { level: 'HIGH', color: 'text-amber-400 bg-amber-950/40 border-amber-900/60' };
    return { level: 'MODERATE', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-900/60' };
  };

  const risk = getRiskLevel();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">What-If Scenario Simulator</h1>
          <p className="text-neutral-400 text-sm">Test custom supply chain disruption timelines and evaluate estimated downstream impacts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">1. Target Industry</label>
              <div className="grid grid-cols-3 gap-2">
                {['Electronics', 'Automotive', 'Pharma'].map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      industry === ind ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-semibold' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">2. Critical Component</label>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Semiconductors">Semiconductors / Microchips</option>
                <option value="Lithium-ion">Lithium-ion Battery Cells</option>
                <option value="Raw Steel">Raw Industrial Steel</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">3. Disruption Duration</label>
                <span className="text-sm font-bold text-emerald-400">{duration} Days</span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-wider text-neutral-500 font-bold">Simulation Output</span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold border ${risk.color} flex items-center gap-1.5`}>
                  <ShieldAlert className="w-3.5 h-3.5" /> Risk: {risk.level}
                </span>
              </div>

              <div className="space-y-4 text-sm text-neutral-300">
                <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
                  <span className="text-xs text-neutral-500 block mb-1">Target Scenario</span>
                  <p className="font-medium text-white">{duration}-day bottleneck in {component} supply for {industry} sector.</p>
                </div>

                <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
                  <span className="text-xs text-neutral-500 block mb-1">Possible Downstream Impact</span>
                  <p className="text-neutral-300">
                    {duration > 10 ? 'Severe production throttling, delivery milestone slippage, and spot-market cost inflation.' : 'Minor buffer depletion with moderate inventory rescheduling required.'}
                  </p>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl">
                  <span className="text-xs text-emerald-400 font-semibold block mb-1">Decision Support Insight</span>
                  <p className="text-xs text-emerald-200/90">
                    &quot;Review secondary regional suppliers and pre-allocate buffer stock before increasing procurement orders.&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
              <span className="text-[11px] text-neutral-500">Note: Decision support prototype.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
