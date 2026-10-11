import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export function HeroCopy({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-full flex flex-col items-start text-left max-w-[560px] select-none pointer-events-auto ${className}`}
    >
      {/* Eyebrow Status Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-strong border border-white/15 mb-3.5 shadow-sm">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span className="text-[11px] font-mono font-medium tracking-wider uppercase text-white/90">
          Autonomous Risk Telemetry · 190+ Countries
        </span>
      </div>

      {/* Main Headline - Bloom Typography with Poppins Medium and Source Serif 4 Italic */}
      <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-medium tracking-tight text-white leading-[1.1] max-w-[540px]">
        See disruption{' '}
        <br className="hidden sm:inline" />
        <span className="font-serif italic font-normal text-white/90">
          before it reaches you.
        </span>
      </h1>

      {/* Subtitle - Crisp grayscale hierarchy */}
      <p className="mt-3.5 max-w-[460px] text-sm sm:text-[15px] text-white/60 font-normal leading-relaxed">
        AI-powered supply-chain intelligence for a world in motion. Continuously tracking maritime corridors, critical minerals, chip choke-points, and trade policy.
      </p>

      {/* Call to Actions - High-contrast monochrome controls */}
      <div className="mt-6 flex flex-wrap items-center justify-start gap-3 w-full sm:w-auto">
        <Link
          href="/dashboard"
          className="group flex items-center justify-center gap-2 px-6 py-2.5 sm:px-7 sm:py-3 rounded-full text-[13px] sm:text-[14px] font-semibold bg-white text-black hover:bg-white/90 transition-all duration-200 shadow-xl hover:scale-[1.02] active:scale-[0.99]"
        >
          <span>Enter Supply Connect</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 text-black" />
        </Link>

        <Link
          href="/explore"
          className="flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-[13px] sm:text-[14px] font-medium text-white/80 hover:text-white liquid-glass hover:bg-white/10 border border-white/15 transition-all duration-200"
        >
          <Compass className="h-4 w-4 text-white/60" />
          <span>View disruption radar</span>
        </Link>
      </div>
    </div>
  );
}
