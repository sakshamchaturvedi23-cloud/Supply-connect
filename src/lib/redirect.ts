/**
 * Only allow same-site relative paths as post-login destinations.
 * Blocks open redirects like "//evil.com", "/\\evil.com" and "https://evil.com".
 */
export function safeRedirectPath(input: string | null | undefined, fallback = '/'): string {
  if (!input) return fallback;
  let path = input.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return fallback;
  }
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\') || /[\r\n\t]/.test(path)) return fallback;
  if (path === '/login' || path.startsWith('/login?') || path.startsWith('/auth/')) return fallback;
  return path;
}

export const PUBLIC_PATHS = ['/login', '/auth/callback'];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
