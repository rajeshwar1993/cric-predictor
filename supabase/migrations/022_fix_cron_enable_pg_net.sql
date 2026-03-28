-- Bragg — 022 Enable pg_net for cron HTTP calls
-- pg_cron was enabled but pg_net (needed for net.http_post) was not.

DO $$
BEGIN
  -- Enable pg_net if available
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
    RAISE NOTICE 'pg_net extension enabled';
  ELSE
    RAISE NOTICE 'pg_net not available — cron HTTP calls will not work';
  END IF;

  -- Re-create the cron job with schema-qualified net call
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists
    PERFORM cron.unschedule('invoke-match-cron');

    PERFORM cron.schedule(
      'invoke-match-cron',
      '* * * * *',
      $cron$
      SELECT extensions.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/match-cron',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'Cron job re-created with pg_net';
  END IF;
END;
$$;
