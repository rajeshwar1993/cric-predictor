-- Bragg — 028 Fix cron schedules with hardcoded project URL
-- current_setting('app.settings.*') doesn't work because those parameters
-- are not configured. Hardcode the URL and key directly.
--
-- IMPORTANT: If you change Supabase projects, update the URL and key here.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Remove broken crons
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-sync-data') THEN
      PERFORM cron.unschedule('invoke-sync-data');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-match-live') THEN
      PERFORM cron.unschedule('invoke-match-live');
    END IF;

    -- Cron 1: sync-data — daily at 5:00 AM IST (23:30 UTC previous day)
    PERFORM cron.schedule(
      'invoke-sync-data',
      '30 23 * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://ykomowsrdehwpllnvwdc.supabase.co/functions/v1/sync-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrb21vd3NyZGVod3BsbG52d2RjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0MDI3MiwiZXhwIjoyMDkwMTE2MjcyfQ.JPqk-08-gH-8qtmgkkAHItAUIKbJF-bztew_ujwpSK4',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    -- Cron 2: match-live — every minute
    PERFORM cron.schedule(
      'invoke-match-live',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://ykomowsrdehwpllnvwdc.supabase.co/functions/v1/match-live',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrb21vd3NyZGVod3BsbG52d2RjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0MDI3MiwiZXhwIjoyMDkwMTE2MjcyfQ.JPqk-08-gH-8qtmgkkAHItAUIKbJF-bztew_ujwpSK4',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'Cron schedules fixed: invoke-sync-data (daily 23:30 UTC), invoke-match-live (every minute)';
  END IF;
END;
$$;
