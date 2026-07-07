'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Eye, FileImage, Pencil, ReceiptText } from 'lucide-react';
import { parseAttachmentLinks } from '@/lib/attachments';
import { formatDate, formatRupiah } from '@/lib/format';
import type { AjuanFilters, AjuanView } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

type Props = {
  rows: AjuanView[];
  filters: AjuanFilters;
  divisiOptions: string[];
};

const paymentStatuses = ['Menunggu Pembayaran', 'Diproses', 'Selesai Dibayar', 'Dibayar Tanpa Bukti TF'];
const reviewStatuses = ['Belum Diajukan', 'Menunggu Review Dirkeu', 'Disetujui Dirkeu', 'Ditolak Dirkeu', 'Perlu Revisi', 'Legacy Finance', 'Selesai Dibayar', 'Dibayar Tanpa Bukti TF'];
const lpjStatuses = ['Belum Jatuh Tempo', 'Jatuh Tempo', 'Terlambat', 'Sudah Upload', 'Tidak Wajib'];
const danaStatuses = ['Belum Input Realisasi', 'Surplus', 'Defisit', 'Sesuai'];

function EmptyPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-100 px-3 text-center text-[11px] font-bold leading-tight text-slate-500">
      {children}
    </span>
  );
}

function SortHeader({
  label,
  asc,
  desc,
  sort,
  onSort
}: {
  label: string;
  asc: string;
  desc: string;
  sort?: string;
  onSort: (sort: string) => void;
}) {
  const active = sort === asc || sort === desc;
  const nextSort = sort === desc ? asc : desc;
  const indicator = sort === asc ? 'ASC' : sort === desc ? 'DESC' : '';

  return (
    <button
      type="button"
      onClick={() => onSort(nextSort)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-teal-50 hover:text-teal-800 ${
        active ? 'bg-teal-50 text-teal-800' : ''
      }`}
      title={`Urutkan ${label}`}
    >
      {label}
      <ArrowDownUp size={13} />
      {indicator ? <span className="text-[11px] font-black">{indicator}</span> : null}
    </button>
  );
}

function HeaderFilter({
  name,
  value,
  options,
  placeholder,
  onChange
}: {
  name: keyof AjuanFilters;
  value?: string;
  options: string[];
  placeholder: string;
  onChange: (name: keyof AjuanFilters, value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">{placeholder}</span>
      <select
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-teal-700"
        value={value || ''}
        onChange={(event) => onChange(name, event.target.value)}
        aria-label={placeholder}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function compareRows(a: AjuanView, b: AjuanView, sort = 'tanggal_desc') {
  if (sort === 'tanggal_asc') return String(a.tanggal_ajuan).localeCompare(String(b.tanggal_ajuan));
  if (sort === 'nominal_desc') return b.nominal - a.nominal;
  if (sort === 'nominal_asc') return a.nominal - b.nominal;
  if (sort === 'pengaju_asc') return a.nama_pengaju.localeCompare(b.nama_pengaju);
  if (sort === 'pengaju_desc') return b.nama_pengaju.localeCompare(a.nama_pengaju);
  if (sort === 'cabang_asc') return a.divisi_cabang.localeCompare(b.divisi_cabang);
  if (sort === 'cabang_desc') return b.divisi_cabang.localeCompare(a.divisi_cabang);
  if (sort === 'status_asc') return a.status.localeCompare(b.status);
  if (sort === 'status_desc') return b.status.localeCompare(a.status);
  if (sort === 'lpj_asc') return a.status_lpj_turunan.localeCompare(b.status_lpj_turunan);
  if (sort === 'lpj_desc') return b.status_lpj_turunan.localeCompare(a.status_lpj_turunan);
  if (sort === 'dana_asc') return a.status_dana.localeCompare(b.status_dana);
  if (sort === 'dana_desc') return b.status_dana.localeCompare(a.status_dana);
  return String(b.tanggal_ajuan).localeCompare(String(a.tanggal_ajuan));
}

export function AjuanTable({ rows, filters, divisiOptions }: Props) {
  const pageSize = 20;
  const [tableFilters, setTableFilters] = useState<AjuanFilters>({
    cabang: filters.cabang,
    status: filters.status,
    review_status_dirkeu: filters.review_status_dirkeu,
    status_lpj: filters.status_lpj,
    status_dana: filters.status_dana,
    sort: filters.sort || 'tanggal_desc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (tableFilters.cabang && row.divisi_cabang !== tableFilters.cabang) return false;
        if (tableFilters.status && row.status !== tableFilters.status) return false;
        if (tableFilters.review_status_dirkeu && row.review_status_dirkeu !== tableFilters.review_status_dirkeu) return false;
        if (tableFilters.status_lpj && row.status_lpj_turunan !== tableFilters.status_lpj) return false;
        if (tableFilters.status_dana && row.status_dana !== tableFilters.status_dana) return false;
        return true;
      })
      .sort((a, b) => compareRows(a, b, tableFilters.sort));
  }, [rows, tableFilters]);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function updateFilter(name: keyof AjuanFilters, value: string) {
    setCurrentPage(1);
    setTableFilters((current) => ({ ...current, [name]: value || undefined }));
  }

  function updateSort(sort: string) {
    setCurrentPage(1);
    setTableFilters((current) => ({ ...current, sort }));
  }

  return (
    <section className="table-shell">
      <div className="border-b border-[color:var(--line)] bg-white/92 px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="section-title">Tabel Ajuan</h2>
            <p className="mt-2 text-sm font-semibold text-[color:var(--muted)]">
              Menampilkan {visibleRows.length} dari {rows.length} ajuan. Sort dan filter di sini hanya mengubah tampilan tabel agar lebih cepat ditinjau.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary self-start md:self-auto"
            onClick={() => {
              setCurrentPage(1);
              setTableFilters({ sort: 'tanggal_desc' });
            }}
          >
            Reset sort/filter tabel
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <HeaderFilter name="cabang" value={tableFilters.cabang} options={divisiOptions} placeholder="Cabang" onChange={updateFilter} />
          <HeaderFilter name="status" value={tableFilters.status} options={paymentStatuses} placeholder="Status" onChange={updateFilter} />
          <HeaderFilter name="review_status_dirkeu" value={tableFilters.review_status_dirkeu} options={reviewStatuses} placeholder="Dirkeu" onChange={updateFilter} />
          <HeaderFilter name="status_lpj" value={tableFilters.status_lpj} options={lpjStatuses} placeholder="LPJ" onChange={updateFilter} />
          <HeaderFilter name="status_dana" value={tableFilters.status_dana} options={danaStatuses} placeholder="Dana" onChange={updateFilter} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs uppercase tracking-wide text-slate-500 backdrop-blur">
            <tr>
              <th className="w-[30%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="Ajuan dan Aksi" sort={tableFilters.sort} onSort={updateSort} asc="tanggal_asc" desc="tanggal_desc" />
              </th>
              <th className="w-[13%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="Pengaju" sort={tableFilters.sort} onSort={updateSort} asc="pengaju_asc" desc="pengaju_desc" />
              </th>
              <th className="w-[12%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="Cabang" sort={tableFilters.sort} onSort={updateSort} asc="cabang_asc" desc="cabang_desc" />
              </th>
              <th className="w-[13%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="Nominal" sort={tableFilters.sort} onSort={updateSort} asc="nominal_asc" desc="nominal_desc" />
              </th>
              <th className="w-[12%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="Status" sort={tableFilters.sort} onSort={updateSort} asc="status_asc" desc="status_desc" />
              </th>
              <th className="w-[12%] border-b border-[color:var(--line)] px-5 py-4">
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-500">Dirkeu</span>
              </th>
              <th className="w-[10%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="LPJ" sort={tableFilters.sort} onSort={updateSort} asc="lpj_asc" desc="lpj_desc" />
              </th>
              <th className="w-[10%] border-b border-[color:var(--line)] px-5 py-4">
                <SortHeader label="Dana" sort={tableFilters.sort} onSort={updateSort} asc="dana_asc" desc="dana_desc" />
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => {
              const memoLinks = parseAttachmentLinks(row.link_memo_ajuan);
              const lpjLinks = parseAttachmentLinks(row.link_lpj);

              return (
                <tr key={row.id_ajuan} className="align-top odd:bg-white even:bg-slate-50/45 hover:bg-teal-50/45">
                  <td className="border-b border-slate-100 px-5 py-5">
                    <p className="font-black text-slate-950">{row.id_ajuan}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(row.tanggal_ajuan)}</p>
                    <p className="mt-1 max-w-[27rem] text-xs leading-relaxed text-slate-600">{row.perihal || row.keterangan || '-'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.link_bukti_transfer ? (
                        <a className="btn-secondary min-h-9 px-3 py-0 text-xs" href={row.link_bukti_transfer} target="_blank" rel="noreferrer">
                          <Eye size={14} /> Bukti
                        </a>
                      ) : (
                        <EmptyPill>Belum TF</EmptyPill>
                      )}
                      {memoLinks.length ? (
                        memoLinks.map((link, index) => (
                          <a key={`${row.id_ajuan}-memo-${index}`} className="btn-secondary min-h-9 px-3 py-0 text-xs" href={link} target="_blank" rel="noreferrer">
                            <FileImage size={14} /> {memoLinks.length > 1 ? `Memo ${index + 1}` : 'Memo'}
                          </a>
                        ))
                      ) : (
                        <EmptyPill>Memo kosong</EmptyPill>
                      )}
                      {lpjLinks.length
                        ? lpjLinks.map((link, index) => (
                            <a key={`${row.id_ajuan}-lpj-${index}`} className="btn-secondary min-h-9 px-3 py-0 text-xs" href={link} target="_blank" rel="noreferrer">
                              <ReceiptText size={14} /> {lpjLinks.length > 1 ? `LPJ ${index + 1}` : 'LPJ'}
                            </a>
                          ))
                        : null}
                      {row.can_submit_to_dirkeu ? <EmptyPill>Siap diajukan</EmptyPill> : null}
                      <Link className="btn-secondary min-h-9 px-3 py-0 text-xs" href={`/ajuan/${row.id_ajuan}/edit`}>
                        <Pencil size={14} /> Edit
                      </Link>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-5 py-5">
                  <p className="font-bold text-slate-900">{row.nama_pengaju || '-'}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Rek: {row.nama_penerima_dana || '-'}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{row.nama_bank || '-'} • {row.nomor_rekening || '-'}</p>
                </td>
                  <td className="border-b border-slate-100 px-5 py-5 font-semibold leading-relaxed text-slate-700">{row.divisi_cabang}</td>
                  <td className="border-b border-slate-100 px-5 py-5">
                    <p className="font-black text-slate-950">{formatRupiah(row.nominal)}</p>
                    <p className="mt-1 text-xs text-slate-500">Realisasi: {formatRupiah(row.nominal_realisasi)}</p>
                  </td>
                  <td className="border-b border-slate-100 px-5 py-5"><StatusBadge value={row.status} /></td>
                  <td className="border-b border-slate-100 px-5 py-5"><StatusBadge value={row.review_status_dirkeu} type="review" /></td>
                  <td className="border-b border-slate-100 px-5 py-5"><StatusBadge value={row.status_lpj_turunan} type="lpj" /></td>
                  <td className="border-b border-slate-100 px-5 py-5">
                    <StatusBadge value={row.status_dana} type="fund" />
                    <p className="mt-2 text-xs font-semibold text-slate-500">Selisih: {formatRupiah(row.selisih_dana)}</p>
                  </td>
                </tr>
              );
            })}
            {!pagedRows.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-bold text-slate-500">
                  Belum ada data sesuai filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[color:var(--line)] bg-white/92 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-[color:var(--muted)]">
            Menampilkan {pagedRows.length} dari {visibleRows.length} ajuan pada halaman {currentPage} dari {totalPages}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .map((page, index, allPages) => (
                <span key={page} className="flex items-center gap-2">
                  {index > 0 && allPages[index - 1] !== page - 1 ? <span className="text-sm font-bold text-slate-400">...</span> : null}
                  <button
                    type="button"
                    className={`rounded-2xl border px-3 py-2 text-xs font-black transition ${
                      page === currentPage
                        ? 'border-transparent bg-teal-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-teal-700 hover:text-teal-800'
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </span>
              ))}
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
