import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateCredentials,
  clientSessionCookieName,
  createSessionToken,
  getDefaultRouteForRole,
  legacySessionCookieName,
  previousSessionCookieName,
  sessionCookieName
} from '@/lib/auth';

const browserSessionMaxAge = 60 * 60 * 12;
const rememberedSessionMaxAge = 60 * 60 * 24 * 30;

function safeNextPath(value: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const inputUser = String(form.get('username') || '');
  const inputPass = String(form.get('password') || '');
  const account = authenticateCredentials(inputUser, inputPass);
  const next = safeNextPath(String(form.get('next') || '/'));
  const remember = form.get('remember') === 'on';

  if (!account) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, request.url), 303);
  }

  const token = createSessionToken(account);
  const redirectTarget = next === '/' ? getDefaultRouteForRole(account.role) : next;
  const maxAge = remember ? rememberedSessionMaxAge : browserSessionMaxAge;
  const response = NextResponse.redirect(new URL(redirectTarget, request.url), 303);
  response.cookies.delete(clientSessionCookieName);
  response.cookies.delete(legacySessionCookieName);
  response.cookies.delete(previousSessionCookieName);
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
  response.cookies.set(clientSessionCookieName, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge
  });
  return response;
}
