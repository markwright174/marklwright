INSERT OR IGNORE INTO study_transcripts
  (source_id, title, recorded_at, summary, transcript, raw_text, from_email, received_at, created_at)
SELECT
  source_id || ':summary',
  title || ' - Summary',
  recorded_at,
  summary,
  '',
  raw_text,
  from_email,
  received_at,
  created_at
FROM study_transcripts
WHERE summary <> '' AND transcript <> '';

INSERT OR IGNORE INTO study_transcripts
  (source_id, title, recorded_at, summary, transcript, raw_text, from_email, received_at, created_at)
SELECT
  source_id || ':transcript',
  title || ' - Transcript',
  recorded_at,
  '',
  transcript,
  raw_text,
  from_email,
  received_at,
  created_at
FROM study_transcripts
WHERE summary <> '' AND transcript <> '';

DELETE FROM study_transcripts
WHERE summary <> '' AND transcript <> '';
