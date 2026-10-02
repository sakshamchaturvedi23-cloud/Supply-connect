import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/redirect';

/**
 * OAuth / magic-link landing route: exchanges the one-time code for a session cookie,
 * then sends the user to `next` (same-site paths only).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeRedirectPath(url.searchParams.get('next'), '/');
  const providerError = url.searchParams.get('error_description') || url.searchParams.get('error');

  if (code && !providerError) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        if (process.env.NODE_ENV !== 'development' && forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        }
        return NextResponse.redirect(new URL(next, url.origin));
      }
      console.error('[auth] code exchange failed:', error.message);
    } catch (e) {
      console.error('[auth] code exchange threw:', e);
    }
  } else if (providerError) {
    console.error('[auth] provider returned an error:', providerError);
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', url.origin));
}
