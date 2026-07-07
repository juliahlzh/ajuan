import Link from 'next/link';
import { BarChart3, Bell, FilePlus2, FileSpreadsheet, LogOut, ReceiptText, UploadCloud } from 'lucide-react';
import type { AuthSession } from '@/lib/auth';

const adminLinks = [
  { href: '/cek-ajuan', label: 'Dashboard', icon: BarChart3 },
  { href: '/ajuan/new', label: 'Input Ajuan', icon: FilePlus2 },
  { href: '/import-sheet', label: 'Import Sheet', icon: FileSpreadsheet },
  { href: '/upload-lpj', label: 'LPJ', icon: ReceiptText }
];

const dirkeuLinks = [
  { href: '/review-dirkeu', label: 'Review Dirkeu', icon: BarChart3 },
  { href: '/upload-bukti', label: 'Bukti TF', icon: UploadCloud }
];

export function TopNav({
  session,
  pathname,
  notificationCount = 0
}: {
  session: AuthSession | null;
  pathname?: string;
  notificationCount?: number;
}) {
  const links = session?.role === 'dirkeu' ? dirkeuLinks : adminLinks;
  const homeHref = session?.role === 'dirkeu' ? '/review-dirkeu' : '/cek-ajuan';

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href={homeHref} className="flex items-center gap-3 rounded-3xl border border-[color:var(--line)] bg-white px-3 py-3 shadow-[var(--shadow-md)] transition hover:-translate-y-0.5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--brand)] text-lg font-black text-white shadow-[0_16px_28px_rgba(15,118,110,0.22)]">AP</span>
          <span>
            <span className="block text-xl font-black leading-tight text-[color:var(--ink)]">Ajuan Pembayaran</span>
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-[color:var(--muted)]">Finance Control Center</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 md:justify-end">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-bold transition ${
                pathname?.startsWith(href)
                  ? 'border-transparent bg-[color:var(--brand)] text-white shadow-[0_12px_24px_rgba(15,118,110,0.22)]'
                  : 'border-[color:var(--line)] bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800'
              }`}
              >
              <Icon size={17} />
              {label}
              {session?.role === 'dirkeu' && href === '/review-dirkeu' && notificationCount > 0 ? (
                <span className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              ) : null}
            </Link>
          ))}
          {session?.role === 'dirkeu' && notificationCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-bold text-amber-900">
              <Bell size={17} />
              {notificationCount} belum ditindaklanjuti
            </span>
          ) : null}
          {session ? (
            <span className="inline-flex shrink-0 items-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--brand-soft)] px-3.5 py-2.5 text-sm font-bold text-[color:var(--brand-strong)]">
              {session.displayName} - {session.role === 'dirkeu' ? 'Dirkeu' : 'Admin'}
            </span>
          ) : null}
          <Link
            href="/logout"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            <LogOut size={17} />
            Logout
          </Link>
        </nav>
      </div>
    </header>
  );
}
