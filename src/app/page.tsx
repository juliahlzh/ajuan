import { redirect } from 'next/navigation';
import { getSession, getDefaultRouteForRole } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? getDefaultRouteForRole(session.role) : '/cek-ajuan');
}
