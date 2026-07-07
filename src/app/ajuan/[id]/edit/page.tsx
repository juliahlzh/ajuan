import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AjuanForm } from '@/components/AjuanForm';
import { DeleteAjuanButton } from '@/components/DeleteAjuanButton';
import { requireRole } from '@/lib/auth';
import { deleteAjuanAction, getAjuan, listAuditLogs, listDivisi, listReviewLogs, submitAjuanToDirkeuAction, toggleArchiveAjuanAction, updateAjuanAction } from '@/lib/ajuan';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EditAjuanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
  await requireRole(['admin']);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [ajuan, divisi, logs, reviewLogs] = await Promise.all([getAjuan(id), listDivisi(), listAuditLogs(id), listReviewLogs(id)]);
  if (!ajuan) notFound();
  const updateAction = updateAjuanAction.bind(null, id);
  const deleteAction = deleteAjuanAction.bind(null, id);
  const submitAction = submitAjuanToDirkeuAction.bind(null, id);
  const archiveAction = toggleArchiveAjuanAction.bind(null, id, !ajuan.is_archived);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-800">Edit Manual</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{ajuan.id_ajuan}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">Perbaiki tanggal, cabang, nama pengaju, memo, realisasi, dan status bila ada data yang kurang tepat.</p>
        </div>
        <Link className="btn-secondary" href="/cek-ajuan">Kembali ke dashboard</Link>
      </section>

      {query.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {query.success === 'submitted' ? 'Ajuan berhasil diajukan ke Dirkeu.' : 'Data ajuan berhasil disimpan.'}
        </div>
      ) : null}

      <AjuanForm
        action={updateAction}
        ajuan={ajuan}
        divisiOptions={divisi}
        mode="edit"
        allowPaymentStatus={ajuan.finance_ready}
        allowLegacyBypass={ajuan.can_submit_to_dirkeu}
      />

      <section className="panel p-6">
        <h2 className="section-title">Approval Dirkeu</h2>
        <p className="section-note">Ajukan setelah data admin sudah final. Jika Dirkeu minta revisi, perbaiki dulu lalu ajukan ulang dari sini.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
          <span>Status saat ini: <span className="font-black text-slate-900">{ajuan.review_status_dirkeu}</span></span>
          {ajuan.review_note_dirkeu ? <span>Catatan terakhir: <span className="font-black text-slate-900">{ajuan.review_note_dirkeu}</span></span> : null}
        </div>
        {ajuan.can_submit_to_dirkeu ? (
          <form action={submitAction} className="mt-5">
            <button className="btn-primary" type="submit">
              {ajuan.can_revisi_dan_ajukan_ulang ? 'Ajukan Ulang ke Dirkeu' : 'Ajukan ke Dirkeu'}
            </button>
          </form>
        ) : (
          <p className="mt-5 text-sm font-semibold text-slate-500">
            Ajuan ini tidak bisa diajukan ulang sekarang karena sedang direview atau sudah masuk tahap finance.
          </p>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Riwayat Review Dirkeu</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {reviewLogs.map((log) => (
            <div key={log.id} className="py-3 text-sm">
              <p className="font-black text-slate-900">{log.action}</p>
              <p className="mt-1 text-slate-500">{formatDate(log.created_at)} | {log.reviewer_name} ({log.reviewer_role})</p>
              {log.note ? <p className="mt-1 text-slate-700">{log.note}</p> : null}
            </div>
          ))}
          {!reviewLogs.length ? <p className="py-4 text-sm font-semibold text-slate-500">Belum ada histori review Dirkeu.</p> : null}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Audit Trail</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {logs.map((log, index) => (
            <div key={`${log.action}-${index}`} className="py-3 text-sm">
              <p className="font-black text-slate-900">{log.action}</p>
              <p className="mt-1 text-slate-500">{formatDate(log.created_at)}</p>
            </div>
          ))}
          {!logs.length ? <p className="py-4 text-sm font-semibold text-slate-500">Belum ada audit log.</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-black text-red-900">Hapus Ajuan</h2>
        <p className="mt-2 text-sm font-semibold text-red-700">Gunakan hanya kalau data benar-benar salah input. Data yang dihapus tidak tampil lagi di dashboard.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={deleteAction}>
            <DeleteAjuanButton />
          </form>
          <form action={archiveAction}>
            <button className="btn-secondary border-amber-200 text-amber-800 hover:bg-amber-50" type="submit">
              {ajuan.is_archived ? 'Pulihkan dari Arsip' : 'Arsipkan Ajuan'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
