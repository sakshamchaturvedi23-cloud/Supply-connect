'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { DEV_MOCK_USER, isDevAuthBypass, isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Current Supabase Auth user (null when signed out).
 * In local development bypass mode, provides a clear developer mock user.
 */
export function useAuthUser() {
  const isBypass = isDevAuthBypass();
  const isConfigured = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(isBypass ? (DEV_MOCK_USER as unknown as User) : null);
  const [loading, setLoading] = useState(!isBypass && isConfigured);

  useEffect(() => {
    if (isBypass) return;
    if (!isConfigured) return;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [isBypass, isConfigured]);

  return { user, loading, isBypass };
}

export async function signOut() {
  if (isDevAuthBypass()) return;
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out failed', error);
}

export function displayName(user: User | null) {
  if (!user) return 'Guest';
  if (user.id === DEV_MOCK_USER.id || user.app_metadata?.provider === 'dev-bypass') {
    return 'Developer (Local Dev)';
  }
  const meta = user.user_metadata ?? {};
  return (meta.full_name || meta.name || user.email?.split('@')[0] || 'Account') as string;
}

export function initials(user: User | null) {
  if (user?.id === DEV_MOCK_USER.id || user?.app_metadata?.provider === 'dev-bypass') {
    return 'DEV';
  }
  const name = displayName(user);
  if (!user) return '';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0]?.toUpperCase() || '';
}

export function isBypassUser(user: User | null): boolean {
  return Boolean(user && (user.id === DEV_MOCK_USER.id || user.app_metadata?.provider === 'dev-bypass'));
}
