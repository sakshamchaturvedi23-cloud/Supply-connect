import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { DEV_MOCK_USER, getSupabaseAnonKey, getSupabaseUrl, isDevAuthBypass, isSupabaseConfigured } from './env';

/**
 * Creates a safe client stub when Supabase is unconfigured, preventing any network
 * calls or browser redirects to placeholder hosts.
 */
function createStubBrowserClient(): SupabaseClient {
  const isBypass = isDevAuthBypass();
  const mockUser = isBypass ? (DEV_MOCK_USER as unknown as User) : null;
  const mockSession = isBypass
    ? ({
        user: mockUser,
        access_token: 'dev-bypass-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'dev-bypass-refresh-token',
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    : null;

  const unconfiguredError = {
    message: isBypass
      ? 'Supabase live database is not configured in local development. Using local demo datasets.'
      : 'Supabase authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
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
      onAuthStateChange: (callback?: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isBypass && typeof callback === 'function') {
          setTimeout(() => callback('SIGNED_IN', mockSession), 0);
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
              id: 'unconfigured-sub',
              callback: () => {},
            },
          },
        };
      },
      getSession: () => Promise.resolve({ data: { session: mockSession }, error: null }),
      getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
      signInWithOAuth: () =>
        Promise.resolve({
          data: { provider: null, url: null },
          error: unconfiguredError,
        }),
      signInWithOtp: () =>
        Promise.resolve({
          data: null,
          error: unconfiguredError,
        }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => createQueryBuilder(),
  } as unknown as SupabaseClient;
}

/**
 * Browser Supabase client. Stores the session in cookies (not localStorage),
 * so the proxy and API routes can see who is signed in. Singleton in the browser.
 * If credentials are not configured, safely returns a stub client that fails closed.
 */
export function createClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    return createStubBrowserClient();
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
