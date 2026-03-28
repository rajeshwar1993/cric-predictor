-- Bragg — 029 Grant service_role full access to all tables
-- Edge Functions use the service_role key which maps to the `service_role` Postgres role.
-- This role needs explicit GRANT permissions on tables, even with RLS enabled.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Also grant to authenticated role for completeness (RLS still applies)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
