import { FileSpreadsheet } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { importAjuanAction } from '@/lib/ajuan';

export const dynamic = 'force-dynamic';

export default async function ImportSheetPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireRole(['admin']);
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-800">Data Lama</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Import Excel / CSV</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Mendukung template baru, sheet Kegiatan dari file verifikasi ajuan, dan mapping lama dengan kolom rekening sebagai penerima dana.
        </p>
      </section>

      {query.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{query.success} baris berhasil diproses.</div> : null}
      {query.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">Pilih file Excel/CSV terlebih dahulu.</div> : null}

      <form action={importAjuanAction} className="panel p-6">
        <label>
          <span className="label">File Excel / CSV</span>
          <input className="field" type="file" name="file" accept=".xlsx,.xls,.csv" required />
        </label>
        <button className="btn-primary mt-6" type="submit"><FileSpreadsheet size={18} /> Import ke Database</button>
      </form>

      <section className="panel p-6">
        <h2 className="section-title">Kolom Template Baru</h2>
        <p className="section-note">
          id_ajuan, tanggal_ajuan, nama_pengaju, nama_penerima_dana, divisi_cabang, jenis_ajuan, nominal, status, link_bukti_transfer, link_memo_ajuan, nominal_realisasi.
        </p>
      </section>
    </div>
  );
}
