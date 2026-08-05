import type { Ajuan } from './types';

export const DIRKEU_ALL_ADMIN_DATA = 'Semua Data Admin' as const;

type DirkeuRowState = Pick<Ajuan, 'approval_stage' | 'review_status_dirkeu' | 'is_archived'>;

export type DirkeuRecordKind = 'approval_required' | 'admin_history' | 'admin_archive';

type DirkeuFinancialSlice = {
  total: number;
  lpjUploaded: number;
  realisasiCount: number;
  nominalTotal: number;
  realisasiTotal: number;
};

export function combineDirkeuFinancialSummary(active: DirkeuFinancialSlice, archived: DirkeuFinancialSlice) {
  return {
    totalAjuan: active.total + archived.total,
    lpjUploaded: active.lpjUploaded + archived.lpjUploaded,
    realisasiCount: active.realisasiCount + archived.realisasiCount,
    nominalTotal: active.nominalTotal + archived.nominalTotal,
    realisasiTotal: active.realisasiTotal + archived.realisasiTotal
  };
}

export function isDirkeuApprovalRequired(row: DirkeuRowState) {
  return !row.is_archived && row.approval_stage === 'submitted' && row.review_status_dirkeu === 'Menunggu Review Dirkeu';
}

export function getDirkeuRecordKind(row: DirkeuRowState): DirkeuRecordKind {
  if (row.is_archived) return 'admin_archive';
  if (isDirkeuApprovalRequired(row)) return 'approval_required';
  return 'admin_history';
}
