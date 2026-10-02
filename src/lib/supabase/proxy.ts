import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath, safeRedirectPath } from '@/lib/redirect';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** Copy refreshed auth cookies onto a redirect/JSON response so a token refresh is never lost. */
function withCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  to.headers.set('Cache-Control', 'private, no-store');
  return to;
}

/**
 * Runs on every matched request:
 * 1. refreshes the Supabase session cookies,
 * 2. sends signed-out visitors to /login (pages) or answers 401 (API),
 * 3. sends signed-in visitors away from /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() verifies the JWT (locally with asymmetric keys, otherwise via the Auth server)
  // and refreshes an expired session. Never use getSession() for this on the server.
  let signedIn = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    signedIn = !error && Boolean(data?.claims?.sub);
  } catch {
    signedIn = false; // Auth unreachable or bad cookie: fail closed.
  }

  const { pathname, search } = request.nextUrl;

  // API: never redirect, answer 401 so fetch() callers get a clear error.
  if (pathname.startsWith('/api/')) {
    if (!signedIn) {
      return withCookies(response, NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 }));
    }
    return response;
  }

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    const back = `${pathname}${search}`;
    if (back !== '/') url.searchParams.set('redirectTo', back);
    return withCookies(response, NextResponse.redirect(url));
  }

  if (signedIn && pathname === '/login') {
    const url = request.nextUrl.clone();
    const dest = safeRedirectPath(request.nextUrl.searchParams.get('redirectTo'), '/');
    const [destPath, destQuery = ''] = dest.split('?');
    url.pathname = destPath;
    url.search = destQuery ? `?${destQuery}` : '';
    return withCookies(response, NextResponse.redirect(url));
  }

  return response;
}
