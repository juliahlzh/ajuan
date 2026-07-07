import Link from 'next/link';
import { BarChart3, CircleDollarSign, Download, FileWarning, ReceiptText, Search } from 'lucide-react';
import { AjuanTable } from '@/components/AjuanTable';
import { StatCard } from '@/components/StatCard';
import { requireRole } from '@/lib/auth';
import { buildDashboard, buildSummary } from '@/lib/domain';
import { compactNumber, formatRupiah } from '@/lib/format';
import { listAjuan, listDivisi, listYears, reviewStatusOptions } from '@/lib/ajuan';

export const dynamic = 'force-dynamic';

type SearchParams = {
  keyword?: string;
  tahun?: string;
  cabang?: string;
  tanggal_awal?: string;
  tanggal_akhir?: string;
  status?: string;
  review_status_dirkeu?: string;
  status_lpj?: string;
  status_dana?: string;
  sort?: string;
  success?: string;
};

export default async function CekAjuanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole(['admin']);
  const query = await searchParams;
  const filters = {
    keyword: query.keyword,
    tahun: query.tahun,
    cabang: query.cabang,
    tanggal_awal: query.tanggal_awal,
    tanggal_akhir: query.tanggal_akhir,
    status: query.status,
    review_status_dirkeu: query.review_status_dirkeu,
    status_lpj: query.status_lpj,
    status_dana: query.status_dana,
    sort: query.sort
  };
  const [rows, years, divisi] = await Promise.all([listAjuan(filters), listYears(), listDivisi()]);
  const summary = buildSummary(rows);
  const dashboard = buildDashboard(rows);
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value) as string[][]);

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="hero-chip">Dashboard Operasional</span>
            <h1 className="mt-4 text-3xl font-black text-[color:var(--ink)] md:text-5xl">Cek Ajuan</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[color:var(--muted)]">
              Satu layar untuk memantau approval Dirkeu, proses finance, LPJ, realisasi, dan lampiran memo tanpa perlu buka banyak tab.
            </p>
          </div>
          <div className="hero-actions">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-3 text-sm font-semibold text-[color:var(--muted)]">
              Total nominal terfilter
              <p className="mt-1 text-xl font-black text-[color:var(--ink)]">{formatRupiah(summary.totalNominal)}</p>
            </div>
            <Link className="btn-secondary" href={`/api/export?${params.toString()}`}>
              <Download size={17} /> Export Excel
            </Link>
            <Link className="btn-primary" href="/ajuan/new">Input Ajuan</Link>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">Fokus Hari Ini</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
              {summary.reviewDirkeu} ajuan menunggu Dirkeu dan {summary.menunggu} ajuan siap ditindaklanjuti finance.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">LPJ</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
              {summary.lpjBelum} ajuan masih butuh upload atau follow-up LPJ.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-white/82 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--muted)]">Realisasi</p>
            <p className="mt-2 text-sm font-semibold text-[color:var(--ink)]">
              Total realisasi saat ini {formatRupiah(summary.totalRealisasi)} dengan selisih {formatRupiah(summary.totalSelisih)}.
            </p>
          </div>
        </div>
      </section>

      {query.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Perubahan berhasil disimpan.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Ajuan" value={compactNumber(summary.total)} note={`${formatRupiah(summary.totalNominal)} nominal`} icon={BarChart3} />
        <StatCard label="Menunggu Review Dirkeu" value={compactNumber(summary.reviewDirkeu)} note="Butuh approval Dirkeu" icon={FileWarning} />
        <StatCard label="Menunggu Bayar" value={compactNumber(summary.menunggu)} note="Butuh follow-up Finance" icon={FileWarning} />
        <StatCard label="LPJ Belum Upload" value={compactNumber(summary.lpjBelum)} note="Termasuk wajib LPJ" icon={ReceiptText} />
        <StatCard label="Total Realisasi" value={formatRupiah(summary.totalRealisasi)} note={`Selisih ${formatRupiah(summary.totalSelisih)}`} icon={CircleDollarSign} />
      </section>

      <section className="toolbar-card">
        <div className="mb-4">
          <h2 className="section-title">Filter Cepat</h2>
          <p className="section-note">Gunakan filter ini saat ingin menyempitkan data sebelum ekspor, edit, atau follow-up.</p>
        </div>
        <form className="toolbar-grid">
          <label className="md:col-span-2 xl:col-span-2">
            <span className="label">Cari nama / ID / rekening</span>
            <div className="search-field-wrap relative">
              <input className="field search-field-input pl-10" name="keyword" defaultValue={filters.keyword || ''} placeholder="Contoh: AJN-2026, Ujang, PT ABC" />
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
            <input className="field" name="cabang" list="filter-cabang" defaultValue={filters.cabang || ''} placeholder="Semua cabang" />
            <datalist id="filter-cabang">
              {divisi.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label>
            <span className="label">Urutkan</span>
            <select className="field" name="sort" defaultValue={filters.sort || 'tanggal_desc'}>
              <option value="tanggal_desc">Tanggal terbaru</option>
              <option value="tanggal_asc">Tanggal terlama</option>
              <option value="nominal_desc">Nominal terbesar</option>
              <option value="nominal_asc">Nominal terkecil</option>
              <option value="pengaju_asc">Nama pengaju A-Z</option>
              <option value="pengaju_desc">Nama pengaju Z-A</option>
              <option value="cabang_asc">Cabang A-Z</option>
              <option value="cabang_desc">Cabang Z-A</option>
              <option value="status_asc">Status A-Z</option>
              <option value="status_desc">Status Z-A</option>
              <option value="lpj_asc">LPJ A-Z</option>
              <option value="dana_asc">Dana A-Z</option>
            </select>
          </label>
          <label>
            <span className="label">Status Bayar</span>
            <select className="field" name="status" defaultValue={filters.status || ''}>
              <option value="">Semua</option>
              <option>Menunggu Pembayaran</option>
              <option>Diproses</option>
              <option>Selesai Dibayar</option>
              <option>Dibayar Tanpa Bukti TF</option>
            </select>
          </label>
          <label>
            <span className="label">Status Dirkeu</span>
            <select className="field" name="review_status_dirkeu" defaultValue={filters.review_status_dirkeu || ''}>
              <option value="">Semua</option>
              {reviewStatusOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Status LPJ</span>
            <select className="field" name="status_lpj" defaultValue={filters.status_lpj || ''}>
              <option value="">Semua</option>
              <option>Belum Jatuh Tempo</option>
              <option>Jatuh Tempo</option>
              <option>Terlambat</option>
              <option>Sudah Upload</option>
              <option>Tidak Wajib</option>
            </select>
          </label>
          <label>
            <span className="label">Status Dana</span>
            <select className="field" name="status_dana" defaultValue={filters.status_dana || ''}>
              <option value="">Semua</option>
              <option>Belum Input Realisasi</option>
              <option>Surplus</option>
              <option>Defisit</option>
              <option>Sesuai</option>
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
          <div className="flex items-end gap-2 xl:col-span-2">
            <button className="btn-primary w-full" type="submit">Terapkan Filter</button>
            <Link className="btn-secondary" href="/cek-ajuan">Reset</Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="kpi-list-card">
          <h2 className="section-title">Breakdown Status</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(dashboard.statusBreakdown).map(([label, count]) => (
              <div key={label} className="list-stripe">
                <span className="font-bold text-slate-700">{label}</span>
                <span className="font-black text-slate-950">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="kpi-list-card">
          <h2 className="section-title">Tren Bulanan</h2>
          <div className="mt-4 space-y-3">
            {dashboard.monthlyTrend.slice(0, 6).map((item) => (
              <div key={item.month} className="list-stripe">
                <span className="font-bold text-slate-700">{item.month}</span>
                <span className="font-black text-slate-950">{formatRupiah(item.nominal)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="kpi-list-card">
          <h2 className="section-title">Top Cabang</h2>
          <div className="mt-4 space-y-3">
            {dashboard.topCabang.slice(0, 6).map((item) => (
              <div key={item.name} className="list-stripe gap-4">
                <span className="truncate font-bold text-slate-700">{item.name}</span>
                <span className="shrink-0 font-black text-slate-950">{formatRupiah(item.nominal)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AjuanTable rows={rows} filters={filters} divisiOptions={divisi} />
    </div>
  );
}
