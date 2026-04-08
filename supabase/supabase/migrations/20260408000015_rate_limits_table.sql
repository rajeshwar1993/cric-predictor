-- POL-SEC-001: Rate limits table (future upgrade path)
-- At launch, rate limiting uses in-memory LRU (globalThis).
-- This table is a prepared upgrade path for multi-region or higher-scale deployments.

CREATE TABLE IF NOT EXISTS v2_rate_limits (
  user_id   UUID        NOT NULL,
  action    TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count     INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, window_start)
);

-- Index for cleanup query
CREATE INDEX IF NOT EXISTS idx_v2_rate_limits_window_start
  ON v2_rate_limits (window_start);

-- Automatic cleanup: delete rows older than 24 hours
-- Scheduled daily at 03:00 UTC via pg_cron
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 3 * * *',
  $$DELETE FROM v2_rate_limits WHERE window_start < now() - INTERVAL '24 hours'$$
);

COMMENT ON TABLE v2_rate_limits IS 'Per-user rate limiting for mutation server actions. Not used at launch (in-memory LRU instead). Prepared for future upgrade.';
