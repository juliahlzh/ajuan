import Link from 'next/link';
import { notFound } from 'next/navigation';
import { parseAttachmentLinks } from '@/lib/attachments';
import { requireRole } from '@/lib/auth';
import { getAjuan, listReviewLogs, markDirkeuSeen, reviewAjuanDirkeuAction } from '@/lib/ajuan';
import { formatDate, formatRupiah } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function ReviewDirkeuDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole(['dirkeu']);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [ajuan, reviewLogs] = await Promise.all([getAjuan(id), listReviewLogs(id)]);
  if (!ajuan) notFound();
  if (ajuan.review_status_dirkeu === 'Menunggu Review Dirkeu') {
    await markDirkeuSeen(id, 'dirkeu');
  }
  const memoLinks = parseAttachmentLinks(ajuan.link_memo_ajuan);
  const canReview = ajuan.approval_stage === 'submitted';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="hero-chip">Detail Review</span>
            <h1 className="mt-4 text-3xl font-black text-[color:var(--ink)]">{ajuan.id_ajuan}</h1>
            <p className="mt-3 text-sm font-semibold text-[color:var(--muted)]">
              Tinjau detail ajuan, memo, nominal, dan berikan keputusan Dirkeu dengan catatan yang jelas.
            </p>
          </div>
          <Link className="btn-secondary" href="/review-dirkeu">Kembali ke daftar review</Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge value={ajuan.review_status_dirkeu} type="review" />
          <StatusBadge value={ajuan.status} />
          <StatusBadge value={ajuan.status_lpj_turunan} type="lpj" />
        </div>
        {ajuan.review_status_dirkeu === 'Menunggu Review Dirkeu' ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Ajuan ini sudah ditandai sebagai telah dilihat Dirkeu.
          </div>
        ) : null}
      </section>

      {query.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Keputusan review berhasil disimpan.
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {decodeURIComponent(query.error)}
        </div>
      ) : null}

      <section className="panel p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-slate-500">Tanggal Ajuan</p>
            <p className="mt-1 text-base font-black text-slate-950">{formatDate(ajuan.tanggal_ajuan)}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Divisi / Cabang</p>
            <p className="mt-1 text-base font-black text-slate-950">{ajuan.divisi_cabang}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Nama Pengaju</p>
            <p className="mt-1 text-base font-black text-slate-950">{ajuan.nama_pengaju}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Atas Nama Rekening</p>
            <p className="mt-1 text-base font-black text-slate-950">{ajuan.atas_nama_rekening}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Bank</p>
            <p className="mt-1 text-base font-black text-slate-950">{ajuan.nama_bank || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Nomor Rekening</p>
            <p className="mt-1 text-base font-black text-slate-950">{ajuan.nomor_rekening || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Jenis Ajuan</p>
            <p className="mt-1 text-base font-black text-slate-950">{ajuan.jenis_ajuan}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Nominal</p>
            <p className="mt-1 text-base font-black text-slate-950">{formatRupiah(ajuan.nominal)}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-bold text-slate-500">Perihal / Keterangan</p>
            <p className="mt-1 text-base font-semibold leading-relaxed text-slate-800">{ajuan.perihal || ajuan.keterangan || '-'}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Status Dirkeu</p>
            <div className="mt-2"><StatusBadge value={ajuan.review_status_dirkeu} type="review" /></div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Status Pembayaran</p>
            <div className="mt-2"><StatusBadge value={ajuan.status} /></div>
          </div>
        </div>
        {memoLinks.length ? (
          <div className="mt-6">
            <p className="text-sm font-bold text-slate-500">Lampiran Memo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {memoLinks.map((link, index) => (
                <a key={`${link}-${index}`} className="btn-secondary" href={link} target="_blank" rel="noreferrer">
                  {memoLinks.length > 1 ? `Memo ${index + 1}` : 'Buka Memo'}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Keputusan Dirkeu</h2>
        <p className="section-note">Catatan akan terlihat oleh admin saat ajuan dikembalikan untuk revisi atau ditolak. Jika Dirkeu menekan Setujui, ajuan otomatis dianggap sudah dibayar. Bukti TF bisa langsung diupload di sini atau dilengkapi belakangan.</p>
        {canReview ? (
          <form action={reviewAjuanDirkeuAction} className="mt-5 space-y-4">
            <input type="hidden" name="id_ajuan" value={ajuan.id_ajuan} />
            <label>
              <span className="label">Catatan Review</span>
              <textarea className="field min-h-32" name="review_note" placeholder="Tulis alasan persetujuan, penolakan, atau revisi" defaultValue={ajuan.review_note_dirkeu || ''} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="label">Upload Bukti TF Saat Approval (opsional)</span>
                <input className="field" type="file" name="bukti_tf" accept=".jpg,.jpeg,.png,.pdf" />
                <p className="mt-2 text-xs font-semibold text-slate-500">Kalau diisi dan klik Setujui, status pembayaran langsung menjadi Selesai Dibayar dengan bukti terlampir.</p>
              </label>
              <label className="panel-muted flex items-start gap-3">
                <input className="mt-1 h-4 w-4 rounded border-slate-300" type="checkbox" name="paid_without_proof" />
                <span className="text-sm font-semibold text-slate-700">
                  Opsi ini tetap tersedia untuk penanda eksplisit bahwa pembayaran selesai <span className="font-black">tanpa bukti TF</span>. Jika tidak upload file, approve juga tetap akan dianggap sudah dibayar.
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" type="submit" name="review_action" value="approve">Setujui</button>
              <button className="btn-secondary" type="submit" name="review_action" value="revise">Minta Revisi</button>
              <button className="btn-danger" type="submit" name="review_action" value="reject">Tolak</button>
            </div>
          </form>
        ) : (
          <p className="mt-5 text-sm font-semibold text-slate-500">
            Ajuan ini sudah tidak berada pada tahap review aktif Dirkeu.
          </p>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Riwayat Review</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {reviewLogs.map((log) => (
            <div key={log.id} className="py-3 text-sm">
              <p className="font-black text-slate-900">{log.action}</p>
              <p className="mt-1 text-slate-500">{formatDate(log.created_at)} | {log.reviewer_name} ({log.reviewer_role})</p>
              {log.note ? <p className="mt-1 text-slate-700">{log.note}</p> : null}
            </div>
          ))}
          {!reviewLogs.length ? <p className="py-4 text-sm font-semibold text-slate-500">Belum ada histori review.</p> : null}
        </div>
      </section>
    </div>
  );
}
