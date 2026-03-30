CREATE TABLE IF NOT EXISTS intake_sessions (
  session_id TEXT PRIMARY KEY,
  cohort_confirmed TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  updated_ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_updated_ts ON intake_sessions(updated_ts);
