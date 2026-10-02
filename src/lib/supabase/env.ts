/**
 * Supabase public config. The placeholders only keep `next build` from crashing
 * when env vars are missing; every auth check then fails closed (signed out).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
