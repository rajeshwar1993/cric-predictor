#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# deploy-migrations.sh — Deploy Supabase migrations
#
# Usage:
#   ./scripts/deploy-migrations.sh              # deploys to staging (default)
#   ./scripts/deploy-migrations.sh staging      # deploys to staging
#   ./scripts/deploy-migrations.sh production   # deploys to production (with confirmation)
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Supabase project references
STAGING_PROJECT_REF="ykomowsrdehwpllnvwdc"
PRODUCTION_PROJECT_REF="lryaiqrybayvzwasrsxp"

REPO_ROOT="$(git rev-parse --show-toplevel)"

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Determine environment
# ---------------------------------------------------------------------------
ENV="${1:-staging}"

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  error "Invalid environment '$ENV'. Use 'staging' or 'production'."
fi

if [[ "$ENV" == "staging" ]]; then
  PROJECT_REF="$STAGING_PROJECT_REF"
  PROJECT_NAME="bragg-staging"
else
  PROJECT_REF="$PRODUCTION_PROJECT_REF"
  PROJECT_NAME="Bragg-prod"
fi

info "Environment: $ENV ($PROJECT_NAME)"
info "Project ref: $PROJECT_REF"

# ---------------------------------------------------------------------------
# 2. Check Supabase CLI is authenticated
# ---------------------------------------------------------------------------
if ! supabase projects list >/dev/null 2>&1; then
  error "Supabase CLI is not authenticated. Run 'supabase login' first."
fi

ok "Supabase CLI authenticated"

# ---------------------------------------------------------------------------
# 3. Link to the target project (temporarily)
# ---------------------------------------------------------------------------
info "Linking to $PROJECT_NAME..."
cd "$REPO_ROOT"
supabase link --project-ref "$PROJECT_REF" 2>/dev/null

ok "Linked to $PROJECT_NAME"

# ---------------------------------------------------------------------------
# 4. Show pending migrations
# ---------------------------------------------------------------------------
info "Checking for pending migrations..."
echo ""

DIFF_OUTPUT=$(supabase db diff --linked 2>&1 || true)

# Show migration files that exist locally
echo -e "${CYAN}Local migrations:${NC}"
ls -1 supabase/migrations/*.sql 2>/dev/null | while read -r f; do
  echo "  $(basename "$f")"
done
echo ""

# ---------------------------------------------------------------------------
# 5. Confirm for production
# ---------------------------------------------------------------------------
if [[ "$ENV" == "production" ]]; then
  echo ""
  warn "You are about to deploy migrations to PRODUCTION."
  warn "Make sure these migrations have been tested on staging first."
  echo ""
  read -p "Type 'production' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "production" ]]; then
    info "Aborted."
    exit 0
  fi
  echo ""
fi

# ---------------------------------------------------------------------------
# 6. Deploy migrations
# ---------------------------------------------------------------------------
info "Deploying migrations to $ENV..."
echo ""

supabase db push --linked || error "Migration deployment failed!"

echo ""
ok "Migrations deployed to $ENV successfully!"

# ---------------------------------------------------------------------------
# 7. Re-link to production (restore default)
# ---------------------------------------------------------------------------
if [[ "$ENV" == "staging" ]]; then
  info "Re-linking to production project (default)..."
  supabase link --project-ref "$PRODUCTION_PROJECT_REF" 2>/dev/null
  ok "Restored link to Bragg-prod"
fi

echo ""
info "Done. Verify the migrations in the Supabase dashboard:"
echo -e "  ${CYAN}https://supabase.com/dashboard/project/$PROJECT_REF/database/migrations${NC}"
