'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

/**
 * Current Supabase Auth user (null when signed out).
 * Ready for when login is added: sign-in anywhere updates every subscriber.
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return { user, loading };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out failed', error);
}

export function displayName(user: User | null) {
  if (!user) return 'Guest';
  const meta = user.user_metadata ?? {};
  return (meta.full_name || meta.name || user.email?.split('@')[0] || 'Account') as string;
}

export function initials(user: User | null) {
  const name = displayName(user);
  if (!user) return '';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0]?.toUpperCase() || '';
}
