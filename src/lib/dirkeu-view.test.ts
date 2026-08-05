import { describe, expect, it } from 'vitest';
import { getDirkeuRecordKind, isDirkeuApprovalRequired } from './dirkeu-view';

describe('tampilan data Dirkeu', () => {
  it('menandai hanya ajuan submitted aktif sebagai antrean approval', () => {
    const row = {
      approval_stage: 'submitted' as const,
      review_status_dirkeu: 'Menunggu Review Dirkeu' as const,
      is_archived: false
    };

    expect(isDirkeuApprovalRequired(row)).toBe(true);
    expect(getDirkeuRecordKind(row)).toBe('approval_required');
  });

  it('membedakan draft dan data selesai sebagai riwayat input admin', () => {
    expect(
      getDirkeuRecordKind({
        approval_stage: 'draft',
        review_status_dirkeu: 'Belum Diajukan',
        is_archived: false
      })
    ).toBe('admin_history');
    expect(
      getDirkeuRecordKind({
        approval_stage: 'finance',
        review_status_dirkeu: 'Disetujui Dirkeu',
        is_archived: false
      })
    ).toBe('admin_history');
  });

  it('mengutamakan label arsip walaupun status lama masih menunggu review', () => {
    expect(
      getDirkeuRecordKind({
        approval_stage: 'submitted',
        review_status_dirkeu: 'Menunggu Review Dirkeu',
        is_archived: true
      })
    ).toBe('admin_archive');
  });
});
