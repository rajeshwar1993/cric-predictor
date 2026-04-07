# Bragg — Deployment Guide

Instructions for deploying Bragg v2 to STG and PROD environments.

---

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`supabase --version`)
- Node.js 20+ (see `web-app-2/.nvmrc`)
- Vercel account with project configured
- Supabase project created (one per environment)

---

## 1. Supabase Setup

### Link the project

```bash
supabase link --project-ref <project-ref> --workdir supabase-2
```

> The project ref is in Supabase Dashboard → Settings → General.

### Clean existing v1 data (first-time only)

If the database has old v1 functions, views, or tables, clean them before pushing v2 migrations.

In **Supabase Dashboard → SQL Editor**, run:

```sql
-- Drop all public functions
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- Drop any remaining v1 views
DROP VIEW IF EXISTS match_live_state CASCADE;
DROP VIEW IF EXISTS match_results CASCADE;

-- Check for other v1 leftovers (drop anything not v2_*)
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'v2_%'
ORDER BY tablename;
```

Also mark old v1 migration history as reverted:

```bash
supabase migration repair --status reverted <version1> <version2> ... --workdir supabase-2
```

### Push migrations

```bash
# Dry run first
supabase db push --workdir supabase-2 --dry-run

# Apply
supabase db push --workdir supabase-2
```

### Verify in Supabase Studio

- [ ] 19 tables with `v2_` prefix exist
- [ ] `v2_sports` — 1 row (Cricket)
- [ ] `v2_leagues` — 1 row (IPL)
- [ ] `v2_seasons` — 1 row (IPL 2026, is_active=true)
- [ ] `v2_league_teams` — 10 rows (IPL teams)
- [ ] `v2_scenario_templates` — 20 rows (19 active + 1 inactive)
- [ ] RLS enabled on all tables (check any table → Policies tab)

### Configure Supabase Auth

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://your-domain.com` (or `http://localhost:3001` for local)
- **Redirect URLs:** Add `https://your-domain.com/auth/callback`

For local development, also add `http://localhost:3001/auth/callback`.

---

## 2. Generate TypeScript Types

After migrations are applied, generate types from the live schema:

```bash
cd web-app-2
npm run db:types
```

This updates `src/types/database.ts` with real table/column types. Commit the generated file.

---

## 3. Vercel Setup

### Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Yes |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key | Yes (or skip analytics) |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | Yes (or skip analytics) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Phase 3+ (cron functions) |

> Find Supabase keys in **Dashboard → Settings → API**.

### Deploy

Push to the branch connected to Vercel, or trigger a manual deploy.

---

## 4. Local Development

Create `web-app-2/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

```bash
cd web-app-2
npm install
npm run dev    # http://localhost:3001
```

---

## 5. Post-Deploy Verification

### Auth flow

- [ ] `/login` — enter email, receive magic link
- [ ] Click magic link → `/onboarding` (first time) or `/dashboard` (returning)
- [ ] Complete onboarding → `/dashboard`
- [ ] Sign out → redirected to `/`
- [ ] Visit `/dashboard` while signed out → redirected to `/login`

### Public pages

- [ ] `/privacy` — renders with footer
- [ ] `/terms` — renders with footer
- [ ] `/nonexistent` — 404 page

### Database

- [ ] Sign in creates a `v2_profiles` row (check in Supabase Studio)
- [ ] Completing onboarding updates `display_name`, `date_of_birth`, `onboarding_completed`

---

## 6. Edge Function Deployment (Phase 3+)

### Set secrets

Supabase reserves the `SUPABASE_*` env prefix — you **cannot** set `SUPABASE_SERVICE_ROLE_KEY` via `supabase secrets set`. Use a custom name:

```bash
supabase secrets set SB_SERVICE_ROLE_KEY=<service-role-key> --project-ref <project-ref>
supabase secrets set SPORTMONKS_API_TOKEN=<token> --project-ref <project-ref>
```

In edge function code, resolve the key with a fallback chain:

```ts
const serviceRoleKey =
  Deno.env.get('SB_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  req.headers.get('Authorization')?.replace('Bearer ', '');
```

### Deploy functions

```bash
supabase functions deploy sync-fixtures --project-ref <project-ref>
supabase functions deploy sync-fixtures-pre-match --project-ref <project-ref>
```

### Table-level GRANT permissions

Migration `20260407000012_grant_table_permissions.sql` grants `SELECT, INSERT, UPDATE, DELETE` on all public tables to `anon`, `authenticated`, and `service_role`. Without this, even service_role queries fail with "permission denied" (this is separate from RLS). Verify after pushing migrations:

```sql
-- Should return grants for anon, authenticated, service_role on each table
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name LIKE 'v2_%'
ORDER BY table_name, grantee;
```

---

## Migration File Naming

Supabase CLI requires timestamp-prefixed migration files:

```
supabase-2/supabase/migrations/
├── 20260406000001_initial_schema.sql
├── 20260406000002_rls_policies.sql
├── 20260406000003_indexes.sql
├── 20260406000004_triggers.sql
├── 20260406000005_seed_data.sql
├── 20260406000006_migrate_from_v1.sql
├── 20260406000012_delete_account_rpc.sql
└── 20260407000012_grant_table_permissions.sql
```

New migrations: use `supabase migration new <name> --workdir supabase-2` to auto-generate the timestamp prefix.

---

## Troubleshooting

### `uuid_generate_v4() does not exist`
The schema uses `gen_random_uuid()` (built-in). If you see this error, an old migration is running. Check migration files for `uuid_generate_v4` references.

### `cannot change name of input parameter`
Old v1 functions with different parameter names conflict with `CREATE OR REPLACE`. Drop all public functions via SQL Editor before pushing migrations (see step 1).

### `Remote migration versions not found`
Old v1 migration history in the database. Repair with:
```bash
supabase migration repair --status reverted <old-versions> --workdir supabase-2
```

### Migrations show "Remote database is up to date" but tables missing
Migration files must have timestamp prefixes (e.g., `20260406000001_`). Plain numbered files are ignored by the CLI.
