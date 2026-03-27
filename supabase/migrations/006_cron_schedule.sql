-- Bragg — 006 Cron Schedule
-- Schedule the match-cron Edge Function to run every minute.
-- Requires pg_cron + pg_net extensions (available on Supabase Pro plan).
--
-- On free plan or local: Edge Functions can be invoked manually or via
-- an external cron service (e.g., cron-job.org, GitHub Actions).

DO $$
BEGIN
  -- Only set up cron if pg_cron is available (Pro plan)
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Schedule: invoke match-cron every minute
    PERFORM cron.schedule(
      'invoke-match-cron',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/match-cron',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'pg_cron schedule created: invoke-match-cron (every minute)';
  ELSE
    RAISE NOTICE 'pg_cron not available — skipping cron schedule. Use an external scheduler.';
  END IF;
END;
$$;

-- To disable: SELECT cron.unschedule('invoke-match-cron');
-- To check status: SELECT * FROM cron.job;
