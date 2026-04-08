# Bragg — Supabase v2

Supabase project for Bragg v2: migrations, Edge Functions, and seed data.

This is the **active** codebase. The sibling `supabase/` folder is deprecated and will be removed after launch.

See [docs/PRD.V2.md](../docs/PRD.V2.md) for full product requirements.

## Structure

```
supabase-2/
├── config.toml        # Supabase CLI configuration
├── migrations/        # Ordered SQL migration files
├── functions/         # Supabase Edge Functions (Deno)
├── seed.sql           # Reference + seed data (FND-DB-005)
└── README.md
```

## Commands

All commands run from the **repo root** using `--workdir`:

```bash
# Deploy migrations to STG
supabase db push --workdir supabase-2

# Dry-run migration (no changes)
supabase db push --workdir supabase-2 --dry-run

# Generate TypeScript types from linked project
supabase gen types typescript --workdir supabase-2 --linked > web-app-2/src/types/database.ts

# Deploy an Edge Function
supabase functions deploy <function-name> --workdir supabase-2

# Check CLI status
supabase --workdir supabase-2 status
```

## Environments

| Environment | Project ref | Notes |
|-------------|-------------|-------|
| STG | *(link via `supabase link`)* | Primary development target |
| PROD | *(not linked yet)* | Linked at launch time |

## Linking to STG

```bash
supabase link --project-ref <stg-project-ref> --workdir supabase-2
```

> **Do not link production** until launch readiness (POL-LAUNCH-001).
