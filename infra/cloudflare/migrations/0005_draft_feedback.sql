-- Learning loop: capture draft lifecycle for fleet-wide improvement
-- Each row = one draft's journey from generation to outcome

CREATE TABLE IF NOT EXISTS draft_feedback (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  message_id TEXT NOT NULL,

  -- Input context (what the model saw)
  prompt_hash TEXT,                    -- SHA256 of prompt for dedup/grouping
  prompt_style TEXT,                   -- default, summarize, options_3, etc.
  model TEXT,                          -- gpt-4.1-mini, etc.

  -- Model output
  original_text TEXT NOT NULL,         -- what the model generated
  confidence TEXT,                     -- low, med, high

  -- Human response
  outcome TEXT NOT NULL,               -- approved_as_is, edited, rejected, regenerated
  final_text TEXT,                     -- what was actually sent (if edited)
  edit_distance INTEGER,               -- levenshtein distance if edited
  human_time_ms INTEGER,               -- time from draft_created to decision

  -- Metadata
  user_id TEXT,                        -- Slack user who acted
  channel_id TEXT,                     -- for aggregating by context
  created_ts INTEGER NOT NULL,         -- when draft was generated
  resolved_ts INTEGER,                 -- when human made decision

  FOREIGN KEY(draft_id) REFERENCES drafts(id),
  FOREIGN KEY(message_id) REFERENCES messages(id)
);

-- Indexes for learning queries
CREATE INDEX IF NOT EXISTS idx_feedback_outcome ON draft_feedback(outcome);
CREATE INDEX IF NOT EXISTS idx_feedback_model ON draft_feedback(model);
CREATE INDEX IF NOT EXISTS idx_feedback_prompt_style ON draft_feedback(prompt_style);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON draft_feedback(created_ts);
CREATE INDEX IF NOT EXISTS idx_feedback_channel ON draft_feedback(channel_id);

-- Aggregate view for quick quality checks
-- Usage: SELECT * FROM feedback_summary WHERE bucket_date = '2026-05-18';
CREATE VIEW IF NOT EXISTS feedback_summary AS
SELECT
  date(created_ts / 1000, 'unixepoch') AS bucket_date,
  model,
  prompt_style,
  outcome,
  COUNT(*) AS count,
  AVG(edit_distance) AS avg_edit_distance,
  AVG(human_time_ms) AS avg_human_time_ms
FROM draft_feedback
GROUP BY bucket_date, model, prompt_style, outcome;
