'use client';

import React from 'react';
import CloudSky from './CloudSky';

export function HeroBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative w-full h-full min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#040406]">
      {/* 1. Animated Cloud Sky WebGL background layer - Harmonized to Bloom Grayscale */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <CloudSky
          background="#040406"
          baseColor="#0e0e13"
          accentColor="#dcdcdc"
          density={50}
          speed={22}
          size={120}
          clouds={{ softness: 110, shadow: 75, cirrus: 35 }}
          sun={{ x: 82, y: 78, glow: 'rgba(255, 255, 255, 0.18)' }}
          pointer={{ parallax: 45, wind: 35, damping: 22 }}
        />
      </div>

      {/* 2. Atmospheric vignette / depth overlay for maximum readability and globe contrast */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 68% 48%, rgba(255, 255, 255, 0.03) 0%, rgba(5, 5, 7, 0.72) 50%, rgba(4, 4, 6, 0.95) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 3. Soft atmospheric lighting bloom behind the globe */}
      <div
        className="pointer-events-none absolute left-1/2 lg:left-[70%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full blur-[140px] opacity-25 z-0"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(4, 4, 6, 0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* 4. Fine Film Grain Texture Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full h-full min-h-[calc(100dvh-4rem)] flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
