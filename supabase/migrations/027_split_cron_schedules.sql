-- Bragg — 021 Split Cron: sync-data (daily) + match-live (every minute)
-- Replaces the monolithic match-cron with two specialized functions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Remove old monolithic cron (if it exists)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-match-cron') THEN
      PERFORM cron.unschedule('invoke-match-cron');
    END IF;

    -- Cron 1: sync-data — daily at 5:00 AM IST (23:30 UTC previous day)
    -- Fetches fixtures for next 10 days, syncs lineups, cleans stale matches.
    PERFORM cron.schedule(
      'invoke-sync-data',
      '30 23 * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    -- Cron 2: match-live — every minute
    -- Handles toss detection, live polling, progressive resolution, match completion.
    -- Internally gated to 12:00 PM – 1:00 AM IST (or if live matches exist).
    PERFORM cron.schedule(
      'invoke-match-live',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/match-live',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'Cron schedules created: invoke-sync-data (daily 23:30 UTC), invoke-match-live (every minute)';
  ELSE
    RAISE NOTICE 'pg_cron not available — use external scheduler or manual invocation.';
  END IF;
END;
$$;

-- Manual invocation examples:
--
-- Sync fixtures (default: next 10 days):
--   supabase functions invoke sync-data
--
-- Sync fixtures (custom range):
--   supabase functions invoke sync-data --body '{"date_start":"2026-03-28","date_stop":"2026-06-01"}'
--
-- Force match processing (skip window check):
--   supabase functions invoke match-live --body '{"skip_window_check":true}'
--
-- Force specific match:
--   supabase functions invoke match-live --body '{"force_match_id":42}'
--
-- Force squad sync for specific match:
--   supabase functions invoke match-live --body '{"sync_squads_for_match":42}'
--
-- To check cron status:
--   SELECT * FROM cron.job;
--
-- To disable:
--   SELECT cron.unschedule('invoke-sync-data');
--   SELECT cron.unschedule('invoke-match-live');
