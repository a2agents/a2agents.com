-- Workspace installations for multi-workspace Slack Connect support
-- Stores OAuth tokens per workspace (team_id)

CREATE TABLE IF NOT EXISTS workspace_installations (
  team_id TEXT PRIMARY KEY,
  team_name TEXT,
  bot_token TEXT NOT NULL,
  bot_user_id TEXT NOT NULL,
  bot_scopes TEXT NOT NULL,
  user_token TEXT,
  user_id TEXT,
  user_scopes TEXT,
  enterprise_id TEXT,
  enterprise_name TEXT,
  is_enterprise_install INTEGER DEFAULT 0,
  installed_at INTEGER NOT NULL,
  last_updated_at INTEGER NOT NULL,
  installer_user_id TEXT,
  app_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_workspace_installations_enterprise ON workspace_installations(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_workspace_installations_installed_at ON workspace_installations(installed_at);

-- Track installation events for audit
CREATE TABLE IF NOT EXISTS installation_events (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_ts INTEGER NOT NULL,
  user_id TEXT,
  metadata_json TEXT,
  FOREIGN KEY(team_id) REFERENCES workspace_installations(team_id)
);

CREATE INDEX IF NOT EXISTS idx_installation_events_team ON installation_events(team_id);
CREATE INDEX IF NOT EXISTS idx_installation_events_ts ON installation_events(event_ts);
