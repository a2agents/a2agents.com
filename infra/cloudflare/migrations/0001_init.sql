CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  from_addr TEXT,
  to_addr TEXT,
  subject TEXT,
  received_ts INTEGER,
  message_id_header TEXT,
  thread_key TEXT,
  slack_channel_id TEXT,
  slack_thread_ts TEXT,
  status TEXT DEFAULT 'new',
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_received_ts ON messages(received_ts);
CREATE INDEX IF NOT EXISTS idx_messages_message_id_header ON messages(message_id_header);
CREATE INDEX IF NOT EXISTS idx_messages_slack_thread ON messages(slack_channel_id, slack_thread_ts);
CREATE INDEX IF NOT EXISTS idx_messages_thread_key ON messages(thread_key);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  created_ts INTEGER,
  created_by TEXT,
  draft_text TEXT,
  model TEXT,
  confidence TEXT,
  approved_ts INTEGER,
  sent_ts INTEGER,
  send_status TEXT DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  FOREIGN KEY(message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_drafts_message_id ON drafts(message_id);
CREATE INDEX IF NOT EXISTS idx_drafts_send_status ON drafts(send_status);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  ts INTEGER,
  type TEXT,
  message_id TEXT,
  draft_id TEXT,
  payload_r2_key TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
