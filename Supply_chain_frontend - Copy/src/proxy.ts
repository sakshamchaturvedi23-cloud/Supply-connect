import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/** Next.js 16 proxy (formerly middleware): auth gate for every page and API route. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static files.
     * (Pages and /api/* are both covered; auth logic lives in lib/supabase/proxy.ts.)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)',
  ],
};
