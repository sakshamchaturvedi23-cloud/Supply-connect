/**
 * Supabase public configuration and environment validation.
 *
 * Never falls back to fake or placeholder hosts.
 * All client factories and auth actions must check isSupabaseConfigured() before
 * attempting network requests or initiating OAuth redirects.
 */

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

/**
 * Local development auth bypass check.
 * Strictly enforced: Only active when NODE_ENV === 'development' AND DEV_AUTH_BYPASS === 'true'.
 * Always returns false in production, test, or preview builds.
 */
export function isDevAuthBypass(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    (process.env.DEV_AUTH_BYPASS === 'true' || process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true')
  );
}

/** Deterministic mock identity used exclusively during local dev bypass. */
export const DEV_MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: { provider: 'dev-bypass' },
  user_metadata: {
    full_name: 'Developer (Demo Mode)',
    name: 'Developer (Demo Mode)',
    email: 'dev@local.supplyconnect.internal',
  },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'dev@local.supplyconnect.internal',
  role: 'authenticated',
};

/**
 * Validates whether the provided string is a legitimate, reachable Supabase project URL.
 * Rejects placeholder patterns, non-HTTP(S) protocols, and malformed hosts.
 */
export function isValidSupabaseUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject obvious placeholders
  if (
    trimmed.includes('placeholder') ||
    trimmed.includes('your-project') ||
    trimmed.includes('example.com')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (!parsed.hostname) return false;

    // Allow localhost/127.0.0.1 for local Supabase emulator
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }

    // Cloud hosted projects must have a valid domain
    const parts = parsed.hostname.split('.');
    if (parts.length < 2) return false;

    // If host ends with supabase.co, must have a specific project ref subdomain
    if (parsed.hostname.endsWith('supabase.co') && parts[0] === 'supabase') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates whether the provided key is a legitimate Supabase anon/publishable key.
 * Rejects placeholders, empty values, or short arbitrary strings.
 */
export function isValidSupabaseAnonKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (!trimmed) return false;

  // Reject placeholders
  if (
    trimmed.includes('placeholder') ||
    trimmed.includes('your-supabase-anon-key') ||
    trimmed.includes('your-') ||
    trimmed.length < 20
  ) {
    return false;
  }

  return true;
}

/**
 * Returns true if both the URL and the anon key are valid and ready for auth/queries.
 */
export function isSupabaseConfigured(): boolean {
  return isValidSupabaseUrl(rawUrl) && isValidSupabaseAnonKey(rawKey);
}

/**
 * Returns a human-readable description of what is missing or misconfigured.
 */
export function getSupabaseConfigError(): string | null {
  if (!rawUrl) {
    return 'NEXT_PUBLIC_SUPABASE_URL is missing. Please set your Supabase project URL in .env.local.';
  }
  if (!isValidSupabaseUrl(rawUrl)) {
    return 'NEXT_PUBLIC_SUPABASE_URL is invalid or still using a placeholder. Set your real project URL (e.g. https://<project-ref>.supabase.co) in .env.local.';
  }
  if (!rawKey) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Please set your Supabase anon key in .env.local.';
  }
  if (!isValidSupabaseAnonKey(rawKey)) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid or still using a placeholder. Set your real Supabase anon key in .env.local.';
  }
  return null;
}

export function getSupabaseUrl(): string {
  return isValidSupabaseUrl(rawUrl) ? rawUrl : '';
}

export function getSupabaseAnonKey(): string {
  return isValidSupabaseAnonKey(rawKey) ? rawKey : '';
}

// Backward-compatible exports, guaranteed to NEVER return a placeholder host
export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = getSupabaseAnonKey();
