-- =============================================================================
-- v2_cron_run_status — Tracks the last run of each cron/edge function
-- Replaces proxy-based health inference (e.g., status_changed_at) with actual
-- run data written by edge functions at the end of each invocation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS v2_cron_run_status (
  job_key       TEXT PRIMARY KEY,
  status        TEXT NOT NULL,                -- 'succeeded' | 'failed'
  started_at    TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL,
  duration_ms   INT NOT NULL,
  summary       JSONB,                        -- function-specific results
  error_count   INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: service_role bypasses; no direct access for anon/authenticated
ALTER TABLE v2_cron_run_status ENABLE ROW LEVEL SECURITY;

-- Grant table permissions (consistent with 20260407000012_grant_table_permissions.sql)
GRANT SELECT, INSERT, UPDATE, DELETE ON v2_cron_run_status TO anon, authenticated, service_role;

COMMENT ON TABLE v2_cron_run_status IS 'Stores the last run status of each cron job. Written by edge functions via logCronRun(). One row per job_key.';
