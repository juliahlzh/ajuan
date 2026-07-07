export type StatusPembayaran = 'Menunggu Pembayaran' | 'Diproses' | 'Selesai Dibayar' | 'Dibayar Tanpa Bukti TF';
export type StatusLpj = 'Belum Upload' | 'Sudah Upload' | 'Tidak Wajib';
export type ApprovalStage = 'draft' | 'submitted' | 'revision_requested' | 'rejected' | 'finance';
export type ReviewStatusDirkeu =
  | 'Belum Diajukan'
  | 'Menunggu Review Dirkeu'
  | 'Disetujui Dirkeu'
  | 'Ditolak Dirkeu'
  | 'Perlu Revisi'
  | 'Legacy Finance';

export type Ajuan = {
  id_ajuan: string;
  tanggal_ajuan: string;
  nama_pengaju: string;
  nama_penerima_dana: string | null;
  nama_bank: string | null;
  nomor_rekening: string | null;
  nomor_memo: string | null;
  perihal: string | null;
  divisi_cabang: string;
  jenis_ajuan: string;
  nominal: number;
  keterangan: string | null;
  status: StatusPembayaran;
  link_bukti_transfer: string | null;
  link_memo_ajuan: string | null;
  wajib_lpj: boolean;
  tanggal_jatuh_tempo_lpj: string | null;
  status_lpj: StatusLpj;
  link_lpj: string | null;
  nominal_realisasi: number | null;
  created_by_role: string;
  approval_stage: ApprovalStage;
  review_status_dirkeu: ReviewStatusDirkeu;
  review_note_dirkeu: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_to_dirkeu_at: string | null;
  dirkeu_seen_at: string | null;
  last_action_by_role: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type AjuanView = Ajuan & {
  status_lpj_turunan: string;
  status_dana: string;
  selisih: number | null;
  selisih_dana: number | null;
  atas_nama_rekening: string;
  finance_ready: boolean;
  can_submit_to_dirkeu: boolean;
  can_revisi_dan_ajukan_ulang: boolean;
};

export type AjuanFilters = {
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
  archived?: string;
};

export type ReviewLog = {
  id: number;
  id_ajuan: string;
  reviewer_role: string;
  reviewer_name: string;
  action: string;
  note: string | null;
  created_at: string;
};
