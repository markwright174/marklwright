CREATE TABLE IF NOT EXISTS study_transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  recorded_at TEXT,
  summary TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL DEFAULT '',
  from_email TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_transcripts_received_at
  ON study_transcripts(received_at DESC);
