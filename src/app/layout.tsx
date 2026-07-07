import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { RememberBridge } from '@/components/RememberBridge';
import { TopNav } from '@/components/TopNav';
import { getSession } from '@/lib/auth';
import { getDirkeuNotificationSummary } from '@/lib/ajuan';

export const metadata: Metadata = {
  title: 'Ajuan Pembayaran',
  description: 'Dashboard ajuan pembayaran, bukti transfer, dan LPJ.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') || '';
  const isLoginPage = pathname.startsWith('/login');
  const session = isLoginPage ? null : await getSession();
  const notificationSummary = session?.role === 'dirkeu' && !isLoginPage ? await getDirkeuNotificationSummary() : null;

  return (
    <html lang="id">
      <body>
        <RememberBridge />
        {isLoginPage ? null : (
          <div className="app-top-nav">
            <TopNav session={session} pathname={pathname} notificationCount={notificationSummary?.actionNeededCount || 0} />
          </div>
        )}
        <main className="app-main mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
