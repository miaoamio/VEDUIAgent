DROP TABLE IF EXISTS user_metrics;
CREATE TABLE user_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  session_count INTEGER DEFAULT 0,
  gen_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  details TEXT,
  created_at INTEGER NOT NULL
);