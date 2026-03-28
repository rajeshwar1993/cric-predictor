-- Bragg — 025 Fix cron job: use app.settings config parameters
-- These must be set on the database via:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<key>';
-- Or via Supabase Dashboard > Database Settings > Postgres Settings

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('invoke-match-cron');

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

    RAISE NOTICE 'Cron job updated to use app.settings config';
  END IF;
END;
$$;
