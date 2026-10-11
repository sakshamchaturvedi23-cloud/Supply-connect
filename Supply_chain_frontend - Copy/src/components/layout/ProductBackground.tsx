'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

export interface ProductBackgroundProps {
  videoSrc?: string;
}

export function ProductBackground({ videoSrc }: ProductBackgroundProps = {}) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
    }
  }, [prefersReducedMotion]);

  const hasValidVideo = Boolean(videoSrc && videoSrc.trim().length > 0);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-20 pointer-events-none overflow-hidden select-none bg-[#040406]"
    >
      {/* Atmospheric video element — rendered strictly only when a valid video URL is provided */}
      {!prefersReducedMotion && !videoError && hasValidVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 h-full w-full object-cover filter grayscale contrast-125 opacity-25 transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-25' : 'opacity-0'
          }`}
          src={videoSrc}
        />
      )}

      {/* Atmospheric Monochrome Liquid Vignette & Light Cones */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 10% 90%, rgba(255, 255, 255, 0.03) 0%, transparent 40%),
            radial-gradient(circle at 90% 70%, rgba(255, 255, 255, 0.02) 0%, transparent 40%),
            linear-gradient(to bottom, rgba(4, 4, 6, 0.4) 0%, rgba(4, 4, 6, 0.85) 50%, rgba(4, 4, 6, 0.98) 100%)
          `,
        }}
      />

      {/* Microscopic grayscale noise grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
