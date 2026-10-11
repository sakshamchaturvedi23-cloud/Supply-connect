import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { DEV_MOCK_USER, getSupabaseAnonKey, getSupabaseUrl, isDevAuthBypass, isSupabaseConfigured } from './env';

function createStubServerClient(): SupabaseClient {
  const unconfiguredError = {
    message: 'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    name: 'SupabaseConfigError',
  };

  const createQueryBuilder = (): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const builder: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve({ data: null, error: unconfiguredError }),
      single: () => Promise.resolve({ data: null, error: unconfiguredError }),
      then: (resolve: (val: any) => any) => Promise.resolve({ data: null, error: unconfiguredError }).then(resolve), // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    return builder;
  };

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: unconfiguredError }),
      getSession: () => Promise.resolve({ data: { session: null }, error: unconfiguredError }),
      exchangeCodeForSession: () => Promise.resolve({ data: { session: null, user: null }, error: unconfiguredError }),
    },
    from: () => createQueryBuilder(),
  } as unknown as SupabaseClient;
}

/** Supabase client for route handlers and server components (reads the auth cookies). */
export async function createClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured()) {
    return createStubServerClient();
  }

  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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
  // 0. Local Development Auth Bypass:
  // Strictly in development mode with flag active, permit mock identity.
  if (isDevAuthBypass()) {
    return { user: DEV_MOCK_USER as unknown as User };
  }

  if (!isSupabaseConfigured()) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: 'Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
        },
        { status: 401 }
      ),
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user };
  } catch (e) {
    console.error('[auth] could not verify user', e);
  }
  return { response: NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 }) };
}
