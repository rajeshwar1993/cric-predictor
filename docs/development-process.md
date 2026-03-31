# Development Process

## Branches

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | Production (auto via Vercel) |
| `staging` | Code under testing | Staging environment |

Both branches are permanent and protected. Never commit directly to them.

## Feature & Bugfix Branches

- Created from `main` (always start from production state).
- Naming:
  - `feature/short-description` — new functionality
  - `bugfix/short-description` — bug fixes

## Development Workflow

```
main ──→ feature/xyz ──→ merge into staging ──→ test on staging
              │
              ▼
        (testing passes)
              │
        run scripts/release.sh:
          1. Verify build + tests pass
          2. Check branch is up-to-date with main
          3. Bump version (minor for feature/, patch for bugfix/)
          4. Commit + push version bump
          5. Create PR: feature/xyz → main
              │
              ▼
        Review + merge PR (manual)
              │
              ▼
        Auto-deploy to production (Vercel)
              │
              ▼
        run scripts/post-release.sh:
          1. Create git tag (e.g., v1.2.0) on main
          2. Create GitHub release with auto-generated notes
          3. Warn if staging has commits not in main
          4. Hard reset staging to match main
          5. Push staging
```

## Step-by-Step

### 1. Start a Feature

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

### 2. Develop

Write code, commit frequently. Follow TDD where applicable. Ensure build and tests pass locally.

### 3. Test on Staging

```bash
git checkout staging
git pull origin staging
git merge feature/my-feature
git push origin staging
```

Staging environment auto-deploys. Test the feature in the staging environment.

If Supabase migrations are involved, deploy them to staging first:

```bash
./scripts/deploy-migrations.sh staging
```

### 4. Prepare Release

Once testing passes, go back to the feature branch and run the release script:

```bash
git checkout feature/my-feature
./scripts/release.sh
```

The script will:
- Verify build and tests pass
- Check the branch is up-to-date with main (prompts to rebase if not)
- Bump the version in `package.json` (minor for `feature/`, patch for `bugfix/`)
- Commit and push the version bump
- Create a pull request from the feature branch into main

### 5. Review & Merge

Review the PR on GitHub. Merge when approved. Production deploys automatically via Vercel.

If Supabase migrations are involved, deploy them to production after the code is merged:

```bash
./scripts/deploy-migrations.sh production
```

### 6. Post-Release

After the PR is merged into main:

```bash
./scripts/post-release.sh
```

The script will:
- Pull latest main
- Create a git tag with the version from `package.json`
- Create a GitHub release with auto-generated release notes
- Check if staging has commits not yet in main (warns you if so)
- Hard reset staging to match main
- Push staging

## Versioning

Follows [Semantic Versioning](https://semver.org/):

| Branch prefix | Version bump | Example |
|---------------|-------------|---------|
| `feature/*` | Minor | 1.0.0 → 1.1.0 |
| `bugfix/*` | Patch | 1.0.0 → 1.0.1 |

Major version bumps are done manually for breaking changes.

## Supabase Migrations

Migrations live in `supabase/migrations/`. Deployment is manual via script.

```bash
# Deploy to staging (default)
./scripts/deploy-migrations.sh

# Deploy to staging (explicit)
./scripts/deploy-migrations.sh staging

# Deploy to production (requires confirmation)
./scripts/deploy-migrations.sh production
```

### Migration Rules

1. **Always test migrations on staging before production.** Run `deploy-migrations.sh staging`, verify in the staging Supabase dashboard, then deploy to production.
2. **Migrations are applied in order.** Supabase tracks which migrations have run. Only new migrations are applied.
3. **Production deployments require confirmation.** The script will show which migrations will be applied and ask for explicit confirmation.
4. **Write reversible migrations.** Include `DROP` statements or rollback logic where possible.

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/release.sh` | Pre-merge: verify, bump version, create PR | `./scripts/release.sh` |
| `scripts/post-release.sh` | Post-merge: tag, GitHub release, reset staging | `./scripts/post-release.sh` |
| `scripts/deploy-migrations.sh` | Deploy Supabase migrations | `./scripts/deploy-migrations.sh [staging\|production]` |
