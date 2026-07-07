'use client';

import { useMemo, useState } from 'react';
import type { AjuanView } from '@/lib/types';
import { formatDate, formatRupiah } from '@/lib/format';

type Props = {
  name: string;
  rows: AjuanView[];
  placeholder?: string;
  label?: string;
};

function buildSearchText(row: AjuanView) {
  return [
    row.id_ajuan,
    row.nama_pengaju,
    row.nama_penerima_dana || '',
    row.perihal || '',
    row.keterangan || '',
    row.divisi_cabang
  ]
    .join(' ')
    .toLowerCase();
}

export function SearchableAjuanPicker({
  name,
  rows,
  placeholder = 'Ketik ID, perihal, atau keterangan ajuan',
  label = 'Cari ajuan'
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const selectedRow = useMemo(
    () => rows.find((row) => row.id_ajuan === selectedId) || null,
    [rows, selectedId]
  );

  const suggestions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows.slice(0, 8);
    return rows.filter((row) => buildSearchText(row).includes(keyword)).slice(0, 8);
  }, [rows, query]);

  function selectRow(row: AjuanView) {
    setSelectedId(row.id_ajuan);
    setQuery(row.id_ajuan);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={selectedId} />
      <label className="block">
        <span className="label">{label}</span>
        <input
          className="field"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId('');
          }}
          placeholder={placeholder}
          autoComplete="off"
          required
        />
      </label>

      {selectedRow ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          Dipilih: <span className="font-black">{selectedRow.id_ajuan}</span> | {selectedRow.perihal || selectedRow.keterangan || '-'} | {selectedRow.divisi_cabang}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Saran Ajuan</p>
        <div className="mt-3 space-y-2">
          {suggestions.map((row) => (
            <button
              key={row.id_ajuan}
              type="button"
              onClick={() => selectRow(row)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
            >
              <p className="text-sm font-black text-slate-950">{row.id_ajuan}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{row.perihal || row.keterangan || '-'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(row.tanggal_ajuan)} | {row.divisi_cabang} | {row.nama_pengaju || '-'} | {formatRupiah(row.nominal)}
              </p>
            </button>
          ))}
          {!suggestions.length ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-500">
              Tidak ada ajuan yang cocok. Coba cari dengan ID, perihal, atau kata pada keterangan.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
