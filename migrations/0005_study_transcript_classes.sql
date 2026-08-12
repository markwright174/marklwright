ALTER TABLE study_transcripts ADD COLUMN class_id TEXT NOT NULL DEFAULT 'unassigned';

CREATE INDEX IF NOT EXISTS idx_study_transcripts_class_id
  ON study_transcripts(class_id, received_at DESC);
