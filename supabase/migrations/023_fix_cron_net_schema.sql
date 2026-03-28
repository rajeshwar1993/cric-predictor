-- Bragg — 023 Fix cron job to use correct net schema
-- pg_net functions are in the 'net' schema, not 'extensions'

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

    RAISE NOTICE 'Cron job updated to use net.http_post';
  END IF;
END;
$$;
