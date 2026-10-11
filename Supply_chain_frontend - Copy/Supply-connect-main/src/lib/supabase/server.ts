import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** Supabase client for route handlers and server components (reads the auth cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: safe to ignore, the proxy refreshes sessions.
        }
      },
    },
  });
}

/**
 * Guard for API routes — defence in depth on top of the proxy.
 * Verifies the user with the Auth server (getUser), never trusts the cookie alone.
 */
export async function requireUser(): Promise<{ user: User; response?: never } | { user?: never; response: NextResponse }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user };
  } catch (e) {
    console.error('[auth] could not verify user', e);
  }
  return { response: NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 }) };
}
