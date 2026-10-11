import { createClient } from '@/lib/supabase/client';

/**
 * Shared browser client for data + auth. Cookie-based session (via @supabase/ssr),
 * so the signed-in user is visible to the proxy and API routes too.
 */
export const supabase = createClient();

// Type definition for database rows
export type DisruptionRow = {
  id: string;
  title: string;
  category: string;
  severity: string;
  location: string;
  description: string;
  impact: string;
  created_at: string;
};
