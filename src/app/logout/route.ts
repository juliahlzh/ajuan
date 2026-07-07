import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clientSessionCookieName, legacySessionCookieName, previousSessionCookieName, sessionCookieName } from '@/lib/auth';

export async function GET() {
  const store = await cookies();
  store.delete(sessionCookieName);
  store.delete(clientSessionCookieName);
  store.delete(previousSessionCookieName);
  store.delete(legacySessionCookieName);
  redirect('/login?logout=1');
}
