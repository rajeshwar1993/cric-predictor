-- Bragg — 006 Cron Schedule
-- Schedule the match-cron Edge Function to run every minute.
-- Requires pg_cron extension (available on Supabase Pro plan).
--
-- On free plan: Edge Functions can be invoked manually or via
-- an external cron service (e.g., cron-job.org, GitHub Actions).
--
-- To enable on Pro plan, run this in the SQL editor:

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: invoke match-cron every minute
-- The Edge Function URL is: {SUPABASE_URL}/functions/v1/match-cron
-- It uses the service_role_key for auth.
SELECT cron.schedule(
  'invoke-match-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/match-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To disable: SELECT cron.unschedule('invoke-match-cron');
-- To check status: SELECT * FROM cron.job;
