'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { safeRedirectPath } from '@/lib/redirect';
import { Logo } from '@/components/shell/Logo';
import { Button } from '@/components/ui/Button';
import { InlineError, Spinner } from '@/components/ui/Feedback';

type Provider = 'google' | 'github';

const URL_ERRORS: Record<string, string> = {
  auth_callback_failed: 'That sign-in link didn’t work or has expired. Request a new one below.',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.02h3.87c2.26-2.09 3.67-5.17 3.67-9.12z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12C3.26 21.36 7.35 24 12 24z" fill="#34A853" />
      <path d="M5.27 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.12z" fill="#FBBC05" />
      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.27 6.61l4 3.12c.95-2.85 3.6-4.98 6.73-4.98z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirectPath(params.get('redirectTo'), '/');
  const urlError = params.get('error');

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [oauth, setOauth] = useState<Provider | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(urlError ? URL_ERRORS[urlError] ?? 'Sign-in failed. Please try again.' : null);

  // If a sign-in completes in this browser (e.g. magic link opened in another tab), move on.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace(redirectTo);
        router.refresh();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, redirectTo]);

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const signInWith = async (provider: Provider) => {
    setOauth(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callbackUrl() } });
    if (error) {
      setError(error.message);
      setOauth(null);
    }
    // On success the browser leaves for the provider, so the spinner stays.
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: callbackUrl() } });
    setSending(false);
    if (error) setError(error.message);
    else setSentTo(address);
  };

  const busy = sending || oauth !== null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>

        {sentTo ? (
          <div className="mt-10 text-center" aria-live="polite">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
              <Mail className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-title-2">Check your inbox</h1>
            <p className="mt-2 text-body text-label-2">
              We sent a sign-in link to <span className="font-medium text-label">{sentTo}</span>. Open it on this device to continue.
            </p>
            <Button variant="ghost" size="sm" className="mt-6" onClick={() => setSentTo(null)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-10 text-center">
              <h1 className="text-title-1">Sign in</h1>
              <p className="mt-2 text-body text-label-2">Track supply chain risks and plan your response.</p>
            </div>

            {error && <InlineError className="mt-6">{error}</InlineError>}

            <div className="mt-8 space-y-2.5">
              <button
                type="button"
                onClick={() => signInWith('google')}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {oauth === 'google' ? <Spinner className="text-black" /> : <GoogleIcon />}
                {oauth === 'google' ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => signInWith('github')}
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-surface-2 text-[15px] font-medium text-label transition-colors hover:bg-surface-3 disabled:opacity-50"
              >
                {oauth === 'github' ? <Spinner /> : <GitHubIcon />}
                {oauth === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}
              </button>
            </div>

            <div className="my-7 flex items-center gap-3 text-[13px] text-label-3">
              <span className="h-px flex-1 bg-line" />
              or use email
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={sendLink} className="space-y-3">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={busy}
                className="h-12 w-full rounded-full bg-surface px-5 text-[15px] text-label outline-none placeholder:text-label-3 focus:ring-2 focus:ring-accent/60 disabled:opacity-60"
              />
              <Button type="submit" size="lg" className="w-full" disabled={busy || !email.trim()}>
                {sending && <Spinner />}
                {sending ? 'Sending link…' : 'Email me a sign-in link'}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-label-3">No password needed. New here? Signing in creates your account.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
