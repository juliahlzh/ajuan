import { LockKeyhole } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  return (
    <>
      <style>{`
        .app-top-nav { display: none; }
        .app-main { max-width: none; padding: 0; }
      `}</style>
      <main className="grid min-h-screen place-items-center px-4 py-10">
      <form action="/api/login" method="post" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-800 text-white">
          <LockKeyhole size={26} />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-950">Login Ajuan Pembayaran</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Masuk untuk mengakses dashboard finance.</p>
        {query.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            Username atau password salah.
          </div>
        ) : null}
        <input type="hidden" name="next" value={query.next || '/'} />
        <label className="mt-6 block">
          <span className="label">Username</span>
          <input className="field" name="username" autoComplete="username" required />
        </label>
        <label className="mt-4 block">
          <span className="label">Password</span>
          <input className="field" name="password" type="password" autoComplete="current-password" required />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-600">
          <input className="h-4 w-4 rounded border-slate-300 text-teal-700" type="checkbox" name="remember" />
          Ingat login saya selama 30 hari
        </label>
        <button className="btn-primary mt-6 w-full" type="submit">Masuk</button>
      </form>
      </main>
    </>
  );
}
