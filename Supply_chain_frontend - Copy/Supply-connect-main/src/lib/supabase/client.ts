import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Browser Supabase client. Stores the session in cookies (not localStorage),
 * so the proxy and API routes can see who is signed in. Singleton in the browser.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
