-- Fleet-wide trace table: the nervous system
-- Every action (HTTP, email, LLM call, file write) flows here
-- Same schema in local, ci, staging, production — env is just a column

CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  name TEXT NOT NULL,
  env TEXT NOT NULL,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  parent_trace_id TEXT,
  tags_json TEXT,
  payload_json TEXT,
  duration_ms INTEGER,
  outcome TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_traces_ts ON traces(ts);
CREATE INDEX IF NOT EXISTS idx_traces_env ON traces(env);
CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id);
CREATE INDEX IF NOT EXISTS idx_traces_name ON traces(name);
CREATE INDEX IF NOT EXISTS idx_traces_parent ON traces(parent_trace_id);
CREATE INDEX IF NOT EXISTS idx_traces_outcome ON traces(outcome);

-- Replay index: fetch all traces for a session in order
CREATE INDEX IF NOT EXISTS idx_traces_replay ON traces(session_id, ts);

-- Fleet sync: fetch recent traces by env for learning
CREATE INDEX IF NOT EXISTS idx_traces_env_ts ON traces(env, ts);
