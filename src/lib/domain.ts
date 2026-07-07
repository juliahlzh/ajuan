import type { Ajuan, AjuanView } from './types';

export function deriveStatusLpj(row: Pick<Ajuan, 'wajib_lpj' | 'status_lpj' | 'tanggal_jatuh_tempo_lpj'>) {
  if (!row.wajib_lpj) return 'Tidak Wajib';
  if (row.status_lpj === 'Sudah Upload') return 'Sudah Upload';
  if (!row.tanggal_jatuh_tempo_lpj) return 'Belum Upload';

  const due = new Date(row.tanggal_jatuh_tempo_lpj);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) return 'Terlambat';
  if (due.getTime() === today.getTime()) return 'Jatuh Tempo';
  return 'Belum Jatuh Tempo';
}

export function deriveStatusDana(row: Pick<Ajuan, 'nominal' | 'nominal_realisasi'>) {
  if (row.nominal_realisasi === null || row.nominal_realisasi === undefined) return 'Belum Input Realisasi';
  if (Number(row.nominal_realisasi) < Number(row.nominal)) return 'Surplus';
  if (Number(row.nominal_realisasi) > Number(row.nominal)) return 'Defisit';
  return 'Sesuai';
}

export function isFinanceReady(row: Pick<Ajuan, 'approval_stage'>) {
  return row.approval_stage === 'finance';
}

export function canSubmitToDirkeu(row: Pick<Ajuan, 'approval_stage'>) {
  return row.approval_stage === 'draft' || row.approval_stage === 'revision_requested' || row.approval_stage === 'rejected';
}

export function deriveReviewStatus(row: Pick<Ajuan, 'approval_stage' | 'review_status_dirkeu' | 'status'>) {
  if (row.status === 'Selesai Dibayar' || row.status === 'Dibayar Tanpa Bukti TF') return row.status;
  if (row.approval_stage === 'draft') return 'Belum Diajukan';
  if (row.approval_stage === 'submitted') return 'Menunggu Review Dirkeu';
  if (row.approval_stage === 'revision_requested') return 'Perlu Revisi';
  if (row.approval_stage === 'rejected') return 'Ditolak Dirkeu';
  if (row.review_status_dirkeu === 'Legacy Finance') return 'Legacy Finance';
  return row.review_status_dirkeu || 'Disetujui Dirkeu';
}

export function toView(row: Ajuan): AjuanView {
  const realisasi = row.nominal_realisasi === null ? null : Number(row.nominal_realisasi);
  const nominal = Number(row.nominal);
  const selisih = realisasi === null ? null : nominal - realisasi;
  return {
    ...row,
    nominal,
    nominal_realisasi: realisasi,
    status_lpj_turunan: deriveStatusLpj(row),
    status_dana: deriveStatusDana(row),
    selisih,
    selisih_dana: selisih,
    atas_nama_rekening: row.nama_penerima_dana || (row.nama_pengaju !== '-' ? row.nama_pengaju : '-'),
    finance_ready: isFinanceReady(row),
    can_submit_to_dirkeu: canSubmitToDirkeu(row),
    can_revisi_dan_ajukan_ulang: row.approval_stage === 'revision_requested' || row.approval_stage === 'rejected'
  };
}

export function buildSummary(rows: AjuanView[]) {
  const raw = rows.reduce(
    (acc, row) => {
      acc.total_data += 1;
      acc.total_ajuan += row.nominal;
      if (row.status === 'Menunggu Pembayaran') acc.menunggu += 1;
      if (row.review_status_dirkeu === 'Menunggu Review Dirkeu') acc.review_dirkeu += 1;
      if (row.status_lpj_turunan !== 'Sudah Upload' && row.wajib_lpj) acc.lpj_belum += 1;
      if (row.nominal_realisasi !== null) {
        acc.count_realisasi += 1;
        acc.total_realisasi += row.nominal_realisasi;
        acc.total_selisih += row.selisih || 0;
      }
      if (row.status_dana === 'Surplus') acc.count_surplus += 1;
      if (row.status_dana === 'Defisit') acc.count_defisit += 1;
      if (row.status_dana === 'Sesuai') acc.count_sesuai += 1;
      return acc;
    },
    {
      total_data: 0,
      total_ajuan: 0,
      total_realisasi: 0,
      total_selisih: 0,
      count_realisasi: 0,
      count_surplus: 0,
      count_defisit: 0,
      count_sesuai: 0,
      menunggu: 0,
      review_dirkeu: 0,
      lpj_belum: 0
    }
  );
  return {
    ...raw,
    total: raw.total_data,
    totalNominal: raw.total_ajuan,
    totalRealisasi: raw.total_realisasi,
    totalSelisih: raw.total_selisih,
    lpjBelum: raw.lpj_belum,
    reviewDirkeu: raw.review_dirkeu
  };
}

export function buildDashboard(rows: AjuanView[]) {
  const status_payment: Record<string, number> = {};
  const status_review: Record<string, number> = {};
  const status_lpj: Record<string, number> = {};
  const status_dana: Record<string, number> = {};
  const top: Record<string, number> = {};
  const trend: Record<string, number> = {};

  for (const row of rows) {
    status_payment[row.status] = (status_payment[row.status] || 0) + 1;
    status_review[deriveReviewStatus(row)] = (status_review[deriveReviewStatus(row)] || 0) + 1;
    status_lpj[row.status_lpj_turunan] = (status_lpj[row.status_lpj_turunan] || 0) + 1;
    status_dana[row.status_dana] = (status_dana[row.status_dana] || 0) + 1;
    top[row.divisi_cabang] = (top[row.divisi_cabang] || 0) + row.nominal;
    const month = row.tanggal_ajuan.slice(0, 7);
    trend[month] = (trend[month] || 0) + row.nominal;
  }

  return {
    status_payment,
    status_review,
    status_lpj,
    status_dana,
    statusBreakdown: status_review,
    top_divisi: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5),
    trend_nominal: Object.entries(trend).sort((a, b) => a[0].localeCompare(b[0])).slice(-6),
    topCabang: Object.entries(top).sort((a, b) => b[1] - a[1]).map(([name, nominal]) => ({ name, nominal })),
    monthlyTrend: Object.entries(trend).sort((a, b) => b[0].localeCompare(a[0])).map(([month, nominal]) => ({ month, nominal }))
  };
}
