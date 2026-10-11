'use client';

import React from 'react';
import { Spinner } from '@/components/ui/Feedback';

export type OAuthProvider = 'google' | 'github';

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.02h3.87c2.26-2.09 3.67-5.17 3.67-9.12z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12C3.26 21.36 7.35 24 12 24z" fill="#34A853" />
      <path d="M5.27 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.12z" fill="#FBBC05" />
      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.27 6.61l4 3.12c.95-2.85 3.6-4.98 6.73-4.98z" fill="#EA4335" />
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function OAuthButtons({
  activeProvider,
  onSignIn,
  disabled,
}: {
  activeProvider: OAuthProvider | null;
  onSignIn: (provider: OAuthProvider) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSignIn('google')}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg bg-white text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50 shadow-sm"
      >
        {activeProvider === 'google' ? <Spinner className="text-black h-3.5 w-3.5" /> : <GoogleIcon />}
        <span>{activeProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </button>

      <button
        type="button"
        onClick={() => onSignIn('github')}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg liquid-glass text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
      >
        {activeProvider === 'github' ? <Spinner className="h-3.5 w-3.5 text-white" /> : <GitHubIcon />}
        <span>{activeProvider === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
      </button>
    </div>
  );
}

