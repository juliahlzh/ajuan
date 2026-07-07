ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS approval_stage TEXT NOT NULL DEFAULT 'finance';
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS review_status_dirkeu TEXT NOT NULL DEFAULT 'Legacy Finance';
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS review_note_dirkeu TEXT;
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS submitted_to_dirkeu_at TIMESTAMPTZ;
ALTER TABLE ajuan ADD COLUMN IF NOT EXISTS last_action_by_role TEXT NOT NULL DEFAULT 'admin';

CREATE TABLE IF NOT EXISTS ajuan_reviews (
  id BIGSERIAL PRIMARY KEY,
  id_ajuan TEXT NOT NULL REFERENCES ajuan(id_ajuan) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajuan_approval_stage ON ajuan(approval_stage);
CREATE INDEX IF NOT EXISTS idx_ajuan_review_status_dirkeu ON ajuan(review_status_dirkeu);
CREATE INDEX IF NOT EXISTS idx_ajuan_reviews_ajuan ON ajuan_reviews(id_ajuan, created_at DESC);
