-- Bragg — 026 Disable cron job until Postgres config is set up

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('invoke-match-cron');
    RAISE NOTICE 'Cron job invoke-match-cron disabled';
  END IF;
END;
$$;
