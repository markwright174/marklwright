CREATE TABLE IF NOT EXISTS study_email_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL,
  source_id TEXT,
  message_id TEXT,
  subject TEXT,
  from_email TEXT,
  to_email TEXT,
  error_detail TEXT,
  summary_length INTEGER NOT NULL DEFAULT 0,
  transcript_length INTEGER NOT NULL DEFAULT 0,
  raw_text_length INTEGER NOT NULL DEFAULT 0,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_email_events_received_at
  ON study_email_events(received_at DESC);
