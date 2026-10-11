'use client';

import React, { useState } from 'react';
import { HeroBackground } from './HeroBackground';
import { Globe } from './Globe';
import { HeroCopy } from './HeroCopy';
import { type SupplyNode } from './globeData';
import { Radio } from 'lucide-react';

export function LandingHero() {
  const [selectedNode, setSelectedNode] = useState<SupplyNode | null>(null);

  return (
    <HeroBackground>
      {/* Main Hero Viewport (centered container with consistent side gutters) */}
      <div className="relative flex-1 w-full max-w-[1520px] mx-auto px-6 sm:px-8 lg:px-12 flex flex-col justify-between overflow-hidden py-4">
        {/* Two-Column Editorial Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center flex-1 my-auto w-full py-2 sm:py-4">
          {/* Left Column: Stable Left Copy (~42-44% of content width) */}
          <div className="lg:col-span-5 flex flex-col justify-center z-20">
            <HeroCopy />
          </div>

          {/* Right Column: Distinct Globe Visual Column (Generous scale, fills open space, no collision) */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end z-10 min-h-0">
            <div className="w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[580px] xl:max-w-[660px] 2xl:max-w-[740px] max-h-[calc(100dvh-200px)] aspect-square flex items-center justify-center">
              <Globe onSelectNode={setSelectedNode} />
            </div>
          </div>
        </div>

        {/* Lower Background Wordmark: SUPPLY CONNECT (atmospheric brand typography anchored behind globe & above footer) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[68px] sm:bottom-[76px] lg:bottom-[84px] inset-x-0 z-[1] flex justify-center select-none overflow-hidden"
        >
          <span
            className="font-black uppercase text-center whitespace-nowrap text-white/[0.025]"
            style={{
              fontSize: 'clamp(2.2rem, 7vw, 6.25rem)',
              textShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
              letterSpacing: '0.04em',
            }}
          >
            SUPPLY CONNECT
          </span>
        </div>

        {/* Reserved Footer Telemetry Strip (Harmonized with Bloom Liquid-Glass Grayscale Theme) */}
        <div className="w-full mt-auto pt-2 pb-2 sm:pb-3 z-20">
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl liquid-glass-strong border border-white/10 text-xs font-mono text-white/80 shadow-2xl">
            {/* Left: Monitored Corridors */}
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="font-semibold text-white whitespace-nowrap">6 Global Corridors Monitored</span>
              <span className="text-white/30 hidden sm:inline">•</span>
              <span className="text-white/60 hidden sm:inline truncate">Malacca · Suez · Panama · Trans-Pacific</span>
            </div>

            {/* Center: Interaction Hint */}
            <div className="hidden xl:flex items-center gap-2 text-white/40 text-[11px]">
              <span>Drag globe to rotate</span>
              <span>•</span>
              <span>Hover ports for live data</span>
            </div>

            {/* Right: Selected Node Focus / Real-Time Status (India focus highlighted) */}
            <div className="flex items-center gap-2.5 shrink-0">
              {selectedNode ? (
                <span className="text-white font-medium truncate">
                  Focus: {selectedNode.name} ({selectedNode.hub})
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-white/80">
                  <Radio className="h-3.5 w-3.5 text-white/60" />
                  <span>Focus: India (JNPT) · Real-time Sync</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </HeroBackground>
  );
}
