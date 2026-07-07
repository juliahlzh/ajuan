import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

export function hasDatabaseUrl() {
  return Boolean(connectionString);
}

const fallbackUrl =
  process.env.NODE_ENV === 'production'
    ? 'postgres://missing:missing@localhost:5432/missing_database_url'
    : 'postgres://postgres:postgres@localhost:5432/ajuan_pembayaran';

export const sql = postgres(connectionString || fallbackUrl, {
  max: 3,
  prepare: false
});

export async function ensureDatabase() {
  let trgmAvailable = true;
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  } catch {
    trgmAvailable = false;
  }
  await sql`
    CREATE TABLE IF NOT EXISTS ajuan (
      id_ajuan TEXT PRIMARY KEY,
      tanggal_ajuan DATE NOT NULL,
      nama_pengaju TEXT NOT NULL,
      nama_penerima_dana TEXT,
      nama_bank TEXT,
      nomor_rekening TEXT,
      nomor_memo TEXT,
      perihal TEXT,
      divisi_cabang TEXT NOT NULL,
      jenis_ajuan TEXT NOT NULL,
      nominal NUMERIC(16,2) NOT NULL DEFAULT 0,
      keterangan TEXT,
      status TEXT NOT NULL DEFAULT 'Menunggu Pembayaran',
      link_bukti_transfer TEXT,
      link_memo_ajuan TEXT,
      wajib_lpj BOOLEAN NOT NULL DEFAULT TRUE,
      tanggal_jatuh_tempo_lpj DATE,
      status_lpj TEXT NOT NULL DEFAULT 'Belum Upload',
      link_lpj TEXT,
      nominal_realisasi NUMERIC(16,2),
      created_by_role TEXT NOT NULL DEFAULT 'admin',
      approval_stage TEXT NOT NULL DEFAULT 'finance',
      review_status_dirkeu TEXT NOT NULL DEFAULT 'Legacy Finance',
      review_note_dirkeu TEXT,
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      submitted_to_dirkeu_at TIMESTAMPTZ,
      dirkeu_seen_at TIMESTAMPTZ,
      last_action_by_role TEXT NOT NULL DEFAULT 'admin',
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'admin'`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS nama_bank TEXT`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS nomor_rekening TEXT`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS approval_stage TEXT NOT NULL DEFAULT 'finance'`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS review_status_dirkeu TEXT NOT NULL DEFAULT 'Legacy Finance'`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS review_note_dirkeu TEXT`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS reviewed_by TEXT`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS submitted_to_dirkeu_at TIMESTAMPTZ`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS dirkeu_seen_at TIMESTAMPTZ`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS last_action_by_role TEXT NOT NULL DEFAULT 'admin'`;
  await sql`ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;

  await sql`
    CREATE TABLE IF NOT EXISTS ajuan_audit_log (
      id BIGSERIAL PRIMARY KEY,
      id_ajuan TEXT NOT NULL REFERENCES ajuan(id_ajuan) ON DELETE CASCADE,
      action TEXT NOT NULL,
      changed_fields JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ajuan_reviews (
      id BIGSERIAL PRIMARY KEY,
      id_ajuan TEXT NOT NULL REFERENCES ajuan(id_ajuan) ON DELETE CASCADE,
      reviewer_role TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      action TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_tanggal ON ajuan(tanggal_ajuan DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_divisi ON ajuan(divisi_cabang)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_status_lpj ON ajuan(status_lpj)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_status_tanggal ON ajuan(status, tanggal_ajuan DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_approval_stage ON ajuan(approval_stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_approval_tanggal ON ajuan(approval_stage, tanggal_ajuan DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_review_status_dirkeu ON ajuan(review_status_dirkeu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_review_tanggal ON ajuan(review_status_dirkeu, tanggal_ajuan DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_dirkeu_seen ON ajuan(dirkeu_seen_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_is_archived ON ajuan(is_archived)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_archived_review ON ajuan(is_archived, review_status_dirkeu, tanggal_ajuan DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_reviews_ajuan ON ajuan_reviews(id_ajuan, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_created_at ON ajuan(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_nominal ON ajuan(nominal DESC)`;
  if (trgmAvailable) {
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_id_trgm ON ajuan USING GIN (id_ajuan gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_pengaju_trgm ON ajuan USING GIN (nama_pengaju gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_rekening_trgm ON ajuan USING GIN ((COALESCE(nama_penerima_dana, '')) gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_divisi_trgm ON ajuan USING GIN (divisi_cabang gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_perihal_trgm ON ajuan USING GIN ((COALESCE(perihal, '')) gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_keterangan_trgm ON ajuan USING GIN ((COALESCE(keterangan, '')) gin_trgm_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ajuan_search_review_note_trgm ON ajuan USING GIN ((COALESCE(review_note_dirkeu, '')) gin_trgm_ops)`;
  }
}
