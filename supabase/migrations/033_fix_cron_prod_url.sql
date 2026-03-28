-- Bragg — 033 Fix cron schedules for production project
-- Update hardcoded URLs from staging to prod.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- Remove staging crons
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
      $cron$
      SELECT net.http_post(
        url := 'https://lryaiqrybayvzwasrsxp.supabase.co/functions/v1/sync-data',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeWFpcXJ5YmF5dnp3YXNyc3hwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NDY5MSwiZXhwIjoyMDkwMjcwNjkxfQ.VTvMaanb4XPrMJQQaiLbb-3ESNNkdDIXL2oBgSA3fqc',
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
        url := 'https://lryaiqrybayvzwasrsxp.supabase.co/functions/v1/match-live',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeWFpcXJ5YmF5dnp3YXNyc3hwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY5NDY5MSwiZXhwIjoyMDkwMjcwNjkxfQ.VTvMaanb4XPrMJQQaiLbb-3ESNNkdDIXL2oBgSA3fqc',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );

    RAISE NOTICE 'Cron schedules set for production: lryaiqrybayvzwasrsxp';
  END IF;
END;
$$;
