import { describe, expect, it } from 'vitest';
import { canSubmitToDirkeu, deriveReviewStatus, deriveStatusDana, deriveStatusLpj, isFinanceReady } from './domain';

describe('domain finance logic', () => {
  it('menghitung status dana dari nominal dan realisasi', () => {
    expect(deriveStatusDana({ nominal: 1000, nominal_realisasi: null })).toBe('Belum Input Realisasi');
    expect(deriveStatusDana({ nominal: 1000, nominal_realisasi: 800 })).toBe('Surplus');
    expect(deriveStatusDana({ nominal: 1000, nominal_realisasi: 1200 })).toBe('Defisit');
    expect(deriveStatusDana({ nominal: 1000, nominal_realisasi: 1000 })).toBe('Sesuai');
  });

  it('menghormati LPJ tidak wajib', () => {
    expect(deriveStatusLpj({ wajib_lpj: false, status_lpj: 'Belum Upload', tanggal_jatuh_tempo_lpj: null })).toBe('Tidak Wajib');
  });

  it('memetakan workflow review dirkeu dengan aman', () => {
    expect(deriveReviewStatus({ approval_stage: 'draft', review_status_dirkeu: 'Belum Diajukan', status: 'Menunggu Pembayaran' })).toBe('Belum Diajukan');
    expect(deriveReviewStatus({ approval_stage: 'submitted', review_status_dirkeu: 'Menunggu Review Dirkeu', status: 'Menunggu Pembayaran' })).toBe('Menunggu Review Dirkeu');
    expect(deriveReviewStatus({ approval_stage: 'finance', review_status_dirkeu: 'Legacy Finance', status: 'Menunggu Pembayaran' })).toBe('Legacy Finance');
    expect(deriveReviewStatus({ approval_stage: 'finance', review_status_dirkeu: 'Disetujui Dirkeu', status: 'Selesai Dibayar' })).toBe('Selesai Dibayar');
    expect(deriveReviewStatus({ approval_stage: 'finance', review_status_dirkeu: 'Disetujui Dirkeu', status: 'Dibayar Tanpa Bukti TF' })).toBe('Dibayar Tanpa Bukti TF');
  });

  it('membedakan tahap submit dan finance ready', () => {
    expect(canSubmitToDirkeu({ approval_stage: 'draft' })).toBe(true);
    expect(canSubmitToDirkeu({ approval_stage: 'submitted' })).toBe(false);
    expect(isFinanceReady({ approval_stage: 'finance' })).toBe(true);
    expect(isFinanceReady({ approval_stage: 'revision_requested' })).toBe(false);
  });
});
