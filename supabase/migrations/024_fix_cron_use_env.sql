-- Bragg — 024 Fix cron job to use direct URL instead of app.settings
-- app.settings.* parameters are not configured on this project

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('invoke-match-cron');

    PERFORM cron.schedule(
      'invoke-match-cron',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://ykomowsrdehwpllnvwdc.supabase.co/functions/v1/match-cron',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'Cron job updated with direct project URL';
  END IF;
END;
$$;
