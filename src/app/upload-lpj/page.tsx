import { ReceiptText } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listAjuan, uploadLpjAction } from '@/lib/ajuan';
import { CurrencyInput } from '@/components/CurrencyInput';
import { SearchableAjuanPicker } from '@/components/SearchableAjuanPicker';

export const dynamic = 'force-dynamic';

function errorMessage(error?: string) {
  if (!error) return '';
  if (error === 'missing') return 'Pilih ajuan lalu isi minimal file LPJ atau link URL LPJ terlebih dahulu.';
  if (error === 'invalid-id') return 'ID Ajuan tidak ditemukan. Pilih ID dari daftar yang tersedia.';
  if (error === 'ajuan-belum-disetujui') return 'Ajuan ini belum disetujui Dirkeu, jadi LPJ belum bisa diproses.';
  if (error === 'invalid-realisasi') return 'Total dana digunakan harus berupa angka positif.';
  if (error === 'invalid-url') return 'Link URL LPJ harus memakai format http:// atau https:// yang valid.';
  return decodeURIComponent(error);
}

export default async function UploadLpjPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireRole(['admin']);
  const query = await searchParams;
  const rows = (await listAjuan()).filter((row) => row.finance_ready && row.wajib_lpj && row.status_lpj !== 'Sudah Upload');
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-800">Pertanggungjawaban</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Upload LPJ</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Upload file LPJ dan isi realisasi agar sistem menghitung surplus, defisit, atau sesuai.</p>
      </section>

      {query.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">LPJ berhasil diupload.</div> : null}
      {query.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{errorMessage(query.error)}</div> : null}

      <form action={uploadLpjAction} className="panel p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <SearchableAjuanPicker
              name="id_ajuan"
              rows={rows}
              label="Cari Ajuan"
              placeholder="Ketik ID, perihal, atau keterangan ajuan"
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">Pencarian bisa lewat ID ajuan, perihal, atau isi keterangan. Klik salah satu hasil agar ID yang benar terpilih.</p>
          </div>
          <label>
            <span className="label">Total Dana Digunakan</span>
            <CurrencyInput name="nominal_realisasi" placeholder="Contoh: 1.500.000" />
          </label>
          <label>
            <span className="label">Link URL LPJ</span>
            <input className="field" type="url" name="lpj_url" placeholder="Contoh: https://drive.google.com/... atau https://docs.google.com/..." />
            <p className="mt-2 text-xs font-semibold text-slate-500">Opsional. Isi jika LPJ diberikan dalam bentuk link Drive, Spreadsheet, atau link dokumen lain.</p>
          </label>
          <label className="md:col-span-2">
            <span className="label">File LPJ</span>
            <input className="field" type="file" name="lpj" accept=".jpg,.jpeg,.png,.pdf" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Opsional. Format JPG, PNG, atau PDF. Maksimal 10 MB. Boleh isi file saja, link saja, atau keduanya.</p>
          </label>
        </div>
        <button className="btn-primary mt-6" type="submit"><ReceiptText size={18} /> Upload LPJ</button>
      </form>
    </div>
  );
}
