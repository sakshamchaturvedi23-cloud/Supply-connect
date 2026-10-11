/**
 * Supabase public configuration and environment validation.
 *
 * Never falls back to fake or placeholder hosts.
 */

const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export function isValidSupabaseUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes('placeholder') || trimmed.includes('your-project') || trimmed.includes('example.com')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidSupabaseAnonKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return Boolean(trimmed && !trimmed.includes('placeholder') && !trimmed.includes('your-') && trimmed.length >= 20);
}

export function isSupabaseConfigured(): boolean {
  return isValidSupabaseUrl(rawUrl) && isValidSupabaseAnonKey(rawKey);
}

export const SUPABASE_URL = isValidSupabaseUrl(rawUrl) ? rawUrl : '';
export const SUPABASE_ANON_KEY = isValidSupabaseAnonKey(rawKey) ? rawKey : '';
