import { AjuanForm } from '@/components/AjuanForm';
import { FloatingNotice } from '@/components/FloatingNotice';
import { requireRole } from '@/lib/auth';
import { createAjuanAction, listDivisi } from '@/lib/ajuan';

export const dynamic = 'force-dynamic';

export default async function NewAjuanPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; id?: string; error?: string }>;
}) {
  await requireRole(['admin']);
  const query = await searchParams;
  const divisi = await listDivisi();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {query.success === 'created' ? (
        <FloatingNotice message={query.id ? `Ajuan ${query.id} sudah tersimpan. Form siap untuk input berikutnya.` : 'Ajuan berhasil disimpan. Form siap untuk input berikutnya.'} />
      ) : null}
      {query.success === 'submitted' ? (
        <FloatingNotice message={query.id ? `Ajuan ${query.id} sudah tersimpan dan langsung diajukan ke Dirkeu.` : 'Ajuan berhasil disimpan dan diajukan ke Dirkeu.'} />
      ) : null}
      <section>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-800">Input Baru</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Form Input Ajuan</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Isi data ajuan pembayaran. Memo bisa dilampirkan sekarang, sedangkan bukti TF dan LPJ bisa menyusul. Jika data sudah final, Admin juga bisa langsung simpan sekaligus kirim ke Dirkeu dari halaman ini.
        </p>
      </section>
      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {decodeURIComponent(query.error)}
        </div>
      ) : null}
      <AjuanForm action={createAjuanAction} divisiOptions={divisi} mode="create" allowLegacyBypass />
    </div>
  );
}
