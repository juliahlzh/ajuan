import { NextRequest, NextResponse } from 'next/server';
import { authEnabled, clientSessionCookieName, getDefaultRouteForRole, getSessionFromToken, sessionCookieName } from '@/lib/auth';

const publicPaths = ['/login', '/api/login', '/api/health', '/auth/restore', '/api/shared-files'];
const adminOnlyPrefixes = ['/cek-ajuan', '/ajuan', '/upload-lpj', '/import-sheet', '/api/export'];
const dirkeuOnlyPrefixes = ['/review-dirkeu', '/upload-bukti'];

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico' || publicPaths.includes(pathname)) {
    return nextWithPathname(request);
  }

  if (!authEnabled()) return nextWithPathname(request);

  const cookie = request.cookies.get(sessionCookieName)?.value;
  const clientCookie = request.cookies.get(clientSessionCookieName)?.value;
  const session = getSessionFromToken(cookie) || getSessionFromToken(clientCookie);

  if (session && cookie !== clientCookie && clientCookie) {
    const response = nextWithPathname(request);
    response.cookies.set(sessionCookieName, clientCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12
    });
    if (matchesPrefix(pathname, adminOnlyPrefixes) && session.role !== 'admin') {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(session.role), request.url));
    }
    if (matchesPrefix(pathname, dirkeuOnlyPrefixes) && session.role !== 'dirkeu') {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(session.role), request.url));
    }
    return response;
  }

  if (session) {
    if (matchesPrefix(pathname, adminOnlyPrefixes) && session.role !== 'admin') {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(session.role), request.url));
    }
    if (matchesPrefix(pathname, dirkeuOnlyPrefixes) && session.role !== 'dirkeu') {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(session.role), request.url));
    }
    return nextWithPathname(request);
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(loginUrl);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
