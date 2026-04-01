-- Bragg — 036 Replace hardcoded cron secrets with Vault
--
-- Previously, cron jobs (028, 033) had the service_role key and project URL
-- hardcoded in the SQL. This migration replaces them with Vault lookups
-- via a reusable wrapper function.
--
-- SETUP REQUIRED per environment:
--   1. Go to Supabase Dashboard > Database > Vault
--   2. Create two secrets:
--      - Name: "project_url"   Value: "https://<project-ref>.supabase.co"
--      - Name: "service_role_key"  Value: <your service_role JWT>
--   3. For local dev, add to config.toml:
--      [db.vault]
--      project_url = "env(SUPABASE_URL)"
--      service_role_key = "env(SUPABASE_SERVICE_ROLE_KEY)"

-- Ensure the private schema exists (not exposed via PostgREST API)
CREATE SCHEMA IF NOT EXISTS private;

-- Helper: invoke any Edge Function by name using Vault secrets
CREATE OR REPLACE FUNCTION private.invoke_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _project_url text;
  _service_key text;
  _request_id bigint;
BEGIN
  SELECT decrypted_secret INTO _project_url
    FROM vault.decrypted_secrets
    WHERE name = 'project_url'
    LIMIT 1;

  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

  IF _project_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'Vault secrets "project_url" or "service_role_key" not found. Skipping Edge Function call.';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := _project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := payload
  ) INTO _request_id;

  RETURN _request_id;
END;
$$;

-- Remove old hardcoded cron jobs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-sync-data') THEN
      PERFORM cron.unschedule('invoke-sync-data');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-match-live') THEN
      PERFORM cron.unschedule('invoke-match-live');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-match-cron') THEN
      PERFORM cron.unschedule('invoke-match-cron');
    END IF;

    -- Cron 1: sync-data — daily at 5:00 AM IST (23:30 UTC)
    PERFORM cron.schedule(
      'invoke-sync-data',
      '30 23 * * *',
      $cron$ SELECT private.invoke_edge_function('sync-data'); $cron$
    );

    -- Cron 2: match-live — every minute
    PERFORM cron.schedule(
      'invoke-match-live',
      '* * * * *',
      $cron$ SELECT private.invoke_edge_function('match-live'); $cron$
    );

    RAISE NOTICE 'Cron schedules updated to use Vault secrets (no more hardcoded keys)';
  END IF;
END;
$$;
