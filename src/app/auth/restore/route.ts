import { NextRequest, NextResponse } from 'next/server';
import { clientSessionCookieName, getSessionFromToken, getDefaultRouteForRole, legacySessionCookieName, previousSessionCookieName, sessionCookieName } from '@/lib/auth';

const browserSessionMaxAge = 60 * 60 * 12;

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const session = getSessionFromToken(token);
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));

  if (!session || !token) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, request.url), 303);
  }

  const redirectTarget = next === '/' ? getDefaultRouteForRole(session.role) : next;
  const response = NextResponse.redirect(new URL(redirectTarget, request.url), 303);
  response.cookies.delete(legacySessionCookieName);
  response.cookies.delete(previousSessionCookieName);
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: browserSessionMaxAge
  });
  response.cookies.set(clientSessionCookieName, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: browserSessionMaxAge
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
