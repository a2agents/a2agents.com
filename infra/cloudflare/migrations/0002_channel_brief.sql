CREATE TABLE IF NOT EXISTS channel_configs (
  channel_id TEXT PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  updated_ts INTEGER,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS channel_briefs (
  channel_id TEXT PRIMARY KEY,
  brief_markdown TEXT NOT NULL,
  pinned_message_ts TEXT,
  updated_ts INTEGER
);
