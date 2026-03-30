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

CREATE TABLE IF NOT EXISTS channel_policy (
  channel_id TEXT PRIMARY KEY,
  purpose TEXT,
  allowed_post_types TEXT,
  disallowed_patterns TEXT,
  preferred_behavior TEXT,
  enforcement_style TEXT,
  escalation_rules TEXT,
  last_updated_by TEXT,
  last_updated_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS channel_routing_map (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  intent_label TEXT NOT NULL,
  keywords TEXT,
  target_channel_id TEXT NOT NULL,
  rationale TEXT,
  updated_by TEXT,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_channel_routing_channel ON channel_routing_map(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_routing_intent ON channel_routing_map(intent_label);

CREATE TABLE IF NOT EXISTS action_log (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  channel_id TEXT,
  thread_ts TEXT,
  message_ts TEXT,
  user_id TEXT,
  action_name TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_log_ts ON action_log(ts);
CREATE INDEX IF NOT EXISTS idx_action_log_channel ON action_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_action_log_action ON action_log(action_name);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  expires_ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_ts);

CREATE TABLE IF NOT EXISTS telemetry_aggregates (
  id TEXT PRIMARY KEY,
  bucket_start_ts INTEGER NOT NULL,
  channel_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_bucket ON telemetry_aggregates(bucket_start_ts);
CREATE INDEX IF NOT EXISTS idx_telemetry_channel_metric ON telemetry_aggregates(channel_id, metric_name);

CREATE TABLE IF NOT EXISTS confirmation_requests (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  args_json TEXT NOT NULL,
  action_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  expires_ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_confirm_lookup ON confirmation_requests(channel_id, thread_ts, user_id, status, expires_ts);

CREATE TABLE IF NOT EXISTS intake_sessions (
  session_id TEXT PRIMARY KEY,
  cohort_confirmed TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  updated_ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_updated_ts ON intake_sessions(updated_ts);
