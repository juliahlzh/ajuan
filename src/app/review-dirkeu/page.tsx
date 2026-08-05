import Link from 'next/link';
import { CheckCircle2, Clock3, Files, Search, XCircle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { getDirkeuNotificationSummary, getReviewDashboardSummary, listAjuan, listDivisi, listYears } from '@/lib/ajuan';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { formatDate, formatRupiah } from '@/lib/format';
import { DIRKEU_ALL_ADMIN_DATA, getDirkeuRecordKind, isDirkeuApprovalRequired } from '@/lib/dirkeu-view';

export const dynamic = 'force-dynamic';

type SearchParams = {
  keyword?: string;
  tahun?: string;
  cabang?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
  status_review?: string;
  page?: string;
  success?: string;
  error?: string;
};

export default async function ReviewDirkeuPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(['dirkeu']);
  const query = await searchParams;
  const filters = {
    keyword: query.keyword,
    tahun: query.tahun,
    cabang: query.cabang,
    tanggal_awal: query.tanggal_awal,
    tanggal_akhir: query.tanggal_akhir
  };
  const statusReview = query.status_review || 'Menunggu Review Dirkeu';
  const pageSize = 15;
  const requestedPage = Math.max(1, Number(query.page || 1) || 1);
  const [activeSummary, archivedSummary, rows, years, divisi] = await Promise.all([
    getReviewDashboardSummary({ ...filters, archived: '0' }),
    getReviewDashboardSummary({ ...filters, archived: '1' }),
    statusReview === DIRKEU_ALL_ADMIN_DATA
      ? listAjuan(filters)
      : statusReview === 'Arsip'
      ? listAjuan({ ...filters, archived: '1' })
      : listAjuan({ ...filters, archived: '0', review_status_dirkeu: statusReview }),
    listYears(),
    listDivisi()
  ]);
  const notificationSummary = await getDirkeuNotificationSummary();

  const totalRows = rows.length;
  const totalAdminRows = activeSummary.total + archivedSummary.total;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const activeRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeTitleMap = {
    [DIRKEU_ALL_ADMIN_DATA]: 'Seluruh Data yang Diinput Admin',
    'Menunggu Review Dirkeu': 'Daftar Menunggu Review',
    'Perlu Revisi': 'Daftar Ajuan Perlu Revisi',
    'Ditolak Dirkeu': 'Daftar Ajuan Ditolak',
    'Disetujui Dirkeu': 'Daftar Ajuan Disetujui',
    Arsip: 'Daftar Arsip Admin'
  } as const;

  const activeNoteMap = {
    [DIRKEU_ALL_ADMIN_DATA]: 'Menampilkan seluruh data aktif dan arsip. Label pada setiap baris membedakan antrean approval dari riwayat input Admin.',
    'Menunggu Review Dirkeu': 'Hanya ajuan yang sudah diajukan admin dan belum diputuskan yang tampil di sini.',
    'Perlu Revisi': 'Daftar ini membantu Dirkeu mengecek ajuan yang sudah dikembalikan untuk perbaikan.',
    'Ditolak Dirkeu': 'Daftar ini menampilkan ajuan yang sudah ditutup oleh Dirkeu.',
    'Disetujui Dirkeu': 'Daftar ini menampilkan ajuan yang sudah disetujui dan dianggap sudah dibayar.',
    Arsip: 'Ajuan yang diarsipkan admin tetap bisa dilihat Dirkeu untuk audit dan pencarian ulang.'
  } as const;

  function buildStatusHref(nextStatus: string) {
    const params = new URLSearchParams();
    if (query.keyword) params.set('keyword', query.keyword);
    if (query.tahun) params.set('tahun', query.tahun);
    if (query.cabang) params.set('cabang', query.cabang);
    if (query.tanggal_awal) params.set('tanggal_awal', query.tanggal_awal);
    if (query.tanggal_akhir) params.set('tanggal_akhir', query.tanggal_akhir);
    params.set('status_review', nextStatus);
    return `/review-dirkeu?${params.toString()}`;
  }

  function buildPageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (query.keyword) params.set('keyword', query.keyword);
    if (query.tahun) params.set('tahun', query.tahun);
    if (query.cabang) params.set('cabang', query.cabang);
    if (query.tanggal_awal) params.set('tanggal_awal', query.tanggal_awal);
    if (query.tanggal_akhir) params.set('tanggal_akhir', query.tanggal_akhir);
    if (query.status_review) params.set('status_review', query.status_review);
    params.set('page', String(nextPage));
    return `/review-dirkeu?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div>
          <span className="hero-chip">Approval Dirkeu</span>
          <h1 className="mt-4 text-3xl font-black text-[color:var(--ink)] md:text-5xl">Review Ajuan</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[color:var(--muted)]">
            Dirkeu dapat meninjau ajuan dari admin, memberi catatan, lalu menyetujui atau meminta revisi.
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">Antrian Aktif</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">{activeSummary.pending} ajuan menunggu keputusan Dirkeu.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">Butuh Revisi</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">{activeSummary.revision} ajuan perlu tindak lanjut dari admin.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">Disetujui</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">{activeSummary.approved} ajuan sudah dianggap dibayar oleh Dirkeu.</p>
          </div>
        </div>
        {notificationSummary.unreadCount > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Ada {notificationSummary.unreadCount} ajuan baru yang belum dilihat dan {notificationSummary.actionNeededCount} ajuan yang masih perlu tindak lanjut.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Tidak ada ajuan baru yang belum dilihat.
          </div>
        )}
      </section>

      {query.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Review Dirkeu berhasil disimpan.
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {decodeURIComponent(query.error)}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Semua Input Admin" value={String(totalAdminRows)} note="Data aktif dan arsip dalam satu daftar" icon={Files} href={buildStatusHref(DIRKEU_ALL_ADMIN_DATA)} active={statusReview === DIRKEU_ALL_ADMIN_DATA} />
        <StatCard label="Menunggu Review" value={String(activeSummary.pending)} note="Perlu keputusan hari ini" icon={Clock3} href={buildStatusHref('Menunggu Review Dirkeu')} active={statusReview === 'Menunggu Review Dirkeu'} />
        <StatCard label="Perlu Revisi" value={String(activeSummary.revision)} note="Kembalikan dengan catatan jelas" icon={Clock3} href={buildStatusHref('Perlu Revisi')} active={statusReview === 'Perlu Revisi'} />
        <StatCard label="Ditolak" value={String(activeSummary.rejected)} note="Sudah ditutup oleh Dirkeu" icon={XCircle} href={buildStatusHref('Ditolak Dirkeu')} active={statusReview === 'Ditolak Dirkeu'} />
        <StatCard label="Disetujui" value={String(activeSummary.approved)} note="Otomatis tercatat sudah dibayar" icon={CheckCircle2} href={buildStatusHref('Disetujui Dirkeu')} active={statusReview === 'Disetujui Dirkeu'} />
        <StatCard label="Arsip Admin" value={String(archivedSummary.total)} note="Data lama tetap bisa dicari" icon={Search} href={buildStatusHref('Arsip')} active={statusReview === 'Arsip'} />
      </section>

      <section className="toolbar-card">
        <div className="mb-4">
          <h2 className="section-title">Filter Review</h2>
          <p className="section-note">Cari cepat ajuan yang perlu dicek berdasarkan ID, pengaju, atau cabang.</p>
        </div>
        <form className="toolbar-grid md:grid-cols-3 xl:grid-cols-7">
          <label className="md:col-span-2 xl:col-span-2">
            <span className="label">Cari ajuan</span>
            <div className="search-field-wrap relative">
              <input className="field search-field-input pl-10" name="keyword" defaultValue={filters.keyword || ''} placeholder="Cari ID, pengaju, cabang, rekening" />
              <Search className="search-field-icon pointer-events-none absolute left-3 top-3.5 text-slate-400 transition" size={18} />
            </div>
          </label>
          <label>
            <span className="label">Tahun</span>
            <select className="field" name="tahun" defaultValue={filters.tahun || ''}>
              <option value="">Semua</option>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Cabang</span>
            <input className="field" name="cabang" list="review-cabang" defaultValue={filters.cabang || ''} placeholder="Semua cabang" />
            <datalist id="review-cabang">
              {divisi.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label>
            <span className="label">Data</span>
            <select className="field" name="status_review" defaultValue={statusReview}>
              <option value={DIRKEU_ALL_ADMIN_DATA}>Semua Input Admin</option>
              <option value="Menunggu Review Dirkeu">Menunggu Review</option>
              <option value="Perlu Revisi">Perlu Revisi</option>
              <option value="Ditolak Dirkeu">Ditolak</option>
              <option value="Disetujui Dirkeu">Disetujui</option>
              <option value="Arsip">Arsip Admin</option>
            </select>
          </label>
          <label>
            <span className="label">Tanggal Awal</span>
            <input className="field" type="date" name="tanggal_awal" defaultValue={filters.tanggal_awal || ''} />
          </label>
          <label>
            <span className="label">Tanggal Akhir</span>
            <input className="field" type="date" name="tanggal_akhir" defaultValue={filters.tanggal_akhir || ''} />
          </label>
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1">
            <button className="btn-primary w-full" type="submit">Cari</button>
            <Link className="btn-secondary" href="/review-dirkeu">Reset</Link>
          </div>
        </form>
      </section>

      <section className="table-shell overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="section-title">{activeTitleMap[statusReview as keyof typeof activeTitleMap] ?? 'Daftar Review Dirkeu'}</h2>
          <p className="section-note">{activeNoteMap[statusReview as keyof typeof activeNoteMap] ?? 'Daftar review Dirkeu.'}</p>
        </div>
        <div className="divide-y divide-slate-100">
          {activeRows.map((row, index) => (
            <div key={row.id_ajuan} className={`flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
              <div className="space-y-2">
                {statusReview === DIRKEU_ALL_ADMIN_DATA ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
                      getDirkeuRecordKind(row) === 'approval_required'
                        ? 'bg-amber-100 text-amber-900 ring-amber-200'
                        : getDirkeuRecordKind(row) === 'admin_archive'
                          ? 'bg-slate-200 text-slate-800 ring-slate-300'
                          : 'bg-blue-100 text-blue-900 ring-blue-200'
                    }`}
                  >
                    {getDirkeuRecordKind(row) === 'approval_required'
                      ? 'Perlu Approval Dirkeu'
                      : getDirkeuRecordKind(row) === 'admin_archive'
                        ? 'Arsip Admin'
                        : 'Riwayat Input Admin'}
                  </span>
                ) : null}
                <p className="text-lg font-black text-slate-950">{row.id_ajuan}</p>
                <p className="text-sm font-semibold text-slate-500">{formatDate(row.tanggal_ajuan)} | {row.divisi_cabang}</p>
                <p className="text-sm font-semibold text-slate-800">{row.perihal || row.keterangan || '-'}</p>
                <p className="text-sm text-slate-600">Pengaju: {row.nama_pengaju} | Rekening: {row.atas_nama_rekening}</p>
                <p className="text-sm text-slate-600">Bank: {row.nama_bank || '-'} | No. Rek: {row.nomor_rekening || '-'}</p>
                {row.is_archived ? <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Arsip Admin</p> : null}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={row.review_status_dirkeu} type="review" />
                  <StatusBadge value={row.status} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                <p className="text-lg font-black text-slate-950">{formatRupiah(row.nominal)}</p>
                <Link className="btn-primary" href={`/review-dirkeu/${row.id_ajuan}`}>{isDirkeuApprovalRequired(row) ? 'Buka Detail Review' : 'Lihat Detail'}</Link>
              </div>
            </div>
          ))}
          {!activeRows.length ? (
            <div className="px-5 py-12 text-center text-sm font-bold text-slate-500">
              {statusReview === DIRKEU_ALL_ADMIN_DATA && 'Belum ada data Admin untuk filter ini.'}
              {statusReview === 'Menunggu Review Dirkeu' && 'Tidak ada ajuan yang sedang menunggu review Dirkeu.'}
              {statusReview === 'Perlu Revisi' && 'Belum ada ajuan dengan status perlu revisi.'}
              {statusReview === 'Ditolak Dirkeu' && 'Belum ada ajuan yang ditolak Dirkeu.'}
              {statusReview === 'Disetujui Dirkeu' && 'Belum ada ajuan yang disetujui Dirkeu.'}
              {statusReview === 'Arsip' && 'Belum ada data arsip untuk filter ini.'}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Menampilkan {activeRows.length} dari {totalRows} data pada halaman {currentPage} dari {totalPages}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              className={`btn-secondary px-3 py-2 text-xs ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
              href={buildPageHref(Math.max(1, currentPage - 1))}
              prefetch={false}
            >
              Prev
            </Link>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1)
              .map((pageNumber, index, allPages) => (
                <span key={pageNumber} className="flex items-center gap-2">
                  {index > 0 && allPages[index - 1] !== pageNumber - 1 ? <span className="text-sm font-bold text-slate-400">...</span> : null}
                  <Link
                    className={`rounded-2xl border px-3 py-2 text-xs font-black transition ${
                      pageNumber === currentPage
                        ? 'border-transparent bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-teal-700 hover:text-teal-800'
                    }`}
                    href={buildPageHref(pageNumber)}
                    prefetch={false}
                  >
                    {pageNumber}
                  </Link>
                </span>
              ))}
            <Link
              className={`btn-secondary px-3 py-2 text-xs ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
              href={buildPageHref(Math.min(totalPages, currentPage + 1))}
              prefetch={false}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
