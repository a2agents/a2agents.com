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
