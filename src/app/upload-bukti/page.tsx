import { CheckCircle2, UploadCloud } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listAjuan, markPaidWithoutProofAction, uploadBuktiAction } from '@/lib/ajuan';

export const dynamic = 'force-dynamic';

function errorMessage(error?: string) {
  if (!error) return '';
  if (error === 'missing') return 'Pilih ajuan dan file bukti terlebih dahulu.';
  if (error === 'missing-id') return 'Pilih ajuan terlebih dahulu.';
  if (error === 'ajuan-belum-disetujui') return 'Ajuan ini belum disetujui Dirkeu, jadi belum bisa diproses pembayaran.';
  return decodeURIComponent(error);
}

export default async function UploadBuktiPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireRole(['dirkeu']);
  const query = await searchParams;
  const rows = (await listAjuan())
    .filter((row) => row.finance_ready && row.status !== 'Selesai Dibayar')
    .slice(0, 500);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="page-hero">
        <div>
          <span className="hero-chip">Area Dirkeu</span>
          <h1 className="mt-4 text-3xl font-black text-[color:var(--ink)] md:text-5xl">Bukti Transfer</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--muted)]">
            Ajuan yang sudah di-approve Dirkeu otomatis dianggap sudah dibayar. Halaman ini dipakai untuk melengkapi bukti transfer, termasuk untuk ajuan yang sebelumnya ditandai tanpa bukti.
          </p>
        </div>
        <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm font-semibold text-[color:var(--ink)]">
          Admin tetap bisa melihat hasil update bukti TF dari dashboard `Cek Ajuan`.
        </div>
      </section>

      {query.success === '1' ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Bukti TF berhasil diupload dan status ajuan menjadi Selesai Dibayar.</div> : null}
      {query.success === 'without-proof' ? <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800">Ajuan berhasil ditandai sebagai Dibayar Tanpa Bukti TF.</div> : null}
      {query.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{errorMessage(query.error)}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={uploadBuktiAction} className="panel p-6">
          <h2 className="section-title">Upload Bukti TF</h2>
          <p className="section-note">Gunakan form ini untuk melampirkan bukti transfer sekarang atau melengkapi ajuan yang sebelumnya sudah ditandai dibayar tanpa bukti.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">ID Ajuan Siap Dibayar</span>
              <select className="field" name="id_ajuan" required>
                <option value="">Pilih ajuan</option>
                {rows.map((row) => (
                  <option key={row.id_ajuan} value={row.id_ajuan}>{row.id_ajuan} - {row.nama_pengaju} - {row.divisi_cabang}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">File Bukti Transfer</span>
              <input className="field" type="file" name="bukti" accept=".jpg,.jpeg,.png,.pdf" required />
              <p className="mt-2 text-xs font-semibold text-slate-500">Format JPG, PNG, atau PDF. Maksimal 10 MB.</p>
            </label>
          </div>
          <button className="btn-primary mt-6" type="submit"><UploadCloud size={18} /> Upload dan Update Status</button>
        </form>

        <form action={markPaidWithoutProofAction} className="panel p-6">
          <h2 className="section-title">Tandai Tanpa Bukti TF</h2>
          <p className="section-note">Gunakan opsi ini untuk kondisi khusus jika pembayaran selesai tetapi memang tidak membutuhkan lampiran bukti transfer.</p>
          <label className="block">
            <span className="label">ID Ajuan Siap Dibayar</span>
            <select className="field" name="id_ajuan" required>
              <option value="">Pilih ajuan</option>
              {rows.map((row) => (
                <option key={`${row.id_ajuan}-no-proof`} value={row.id_ajuan}>{row.id_ajuan} - {row.nama_pengaju} - {row.divisi_cabang}</option>
              ))}
            </select>
          </label>
          <div className="panel-muted mt-4">
            Status akhir ajuan akan menjadi <span className="font-black">Dibayar Tanpa Bukti TF</span>.
          </div>
          <button className="btn-secondary mt-6" type="submit"><CheckCircle2 size={18} /> Tandai Sudah Dibayar</button>
        </form>
      </div>

      {!rows.length ? (
        <div className="panel-muted text-center">
          Belum ada ajuan disetujui Dirkeu yang perlu dilengkapi bukti transfer.
        </div>
      ) : null}
    </div>
  );
}
