import type { Ajuan } from './types';

export const DIRKEU_ALL_ADMIN_DATA = 'Semua Data Admin' as const;

type DirkeuRowState = Pick<Ajuan, 'approval_stage' | 'review_status_dirkeu' | 'is_archived'>;

export type DirkeuRecordKind = 'approval_required' | 'admin_history' | 'admin_archive';

export function isDirkeuApprovalRequired(row: DirkeuRowState) {
  return !row.is_archived && row.approval_stage === 'submitted' && row.review_status_dirkeu === 'Menunggu Review Dirkeu';
}

export function getDirkeuRecordKind(row: DirkeuRowState): DirkeuRecordKind {
  if (row.is_archived) return 'admin_archive';
  if (isDirkeuApprovalRequired(row)) return 'approval_required';
  return 'admin_history';
}
