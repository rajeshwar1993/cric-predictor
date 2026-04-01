#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# deploy-functions.sh — Deploy Supabase Edge Functions
#
# Usage:
#   ./scripts/deploy-functions.sh                          # deploys ALL functions to staging
#   ./scripts/deploy-functions.sh staging                  # deploys ALL functions to staging
#   ./scripts/deploy-functions.sh production               # deploys ALL functions to production (with confirmation)
#   ./scripts/deploy-functions.sh staging match-cron       # deploys a single function to staging
#   ./scripts/deploy-functions.sh production sync-data     # deploys a single function to production
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
FUNCTIONS_DIR="$REPO_ROOT/supabase/functions"

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Determine environment and optional function name
# ---------------------------------------------------------------------------
ENV="${1:-staging}"
FUNCTION_NAME="${2:-}"

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
# 2. Discover deployable functions
# ---------------------------------------------------------------------------
get_functions() {
  local funcs=()
  for dir in "$FUNCTIONS_DIR"/*/; do
    local name
    name="$(basename "$dir")"
    # Skip shared modules (prefixed with _)
    [[ "$name" == _* ]] && continue
    funcs+=("$name")
  done
  echo "${funcs[@]}"
}

ALL_FUNCTIONS=$(get_functions)

if [[ -n "$FUNCTION_NAME" ]]; then
  # Validate the requested function exists
  if [[ ! -d "$FUNCTIONS_DIR/$FUNCTION_NAME" ]]; then
    error "Function '$FUNCTION_NAME' not found in $FUNCTIONS_DIR"
  fi
  DEPLOY_FUNCTIONS=("$FUNCTION_NAME")
else
  read -ra DEPLOY_FUNCTIONS <<< "$ALL_FUNCTIONS"
fi

echo ""
echo -e "${CYAN}Functions to deploy:${NC}"
for fn in "${DEPLOY_FUNCTIONS[@]}"; do
  echo "  $fn"
done
echo ""

# ---------------------------------------------------------------------------
# 3. Check Supabase CLI is authenticated
# ---------------------------------------------------------------------------
if ! supabase projects list >/dev/null 2>&1; then
  error "Supabase CLI is not authenticated. Run 'supabase login' first."
fi

ok "Supabase CLI authenticated"

# ---------------------------------------------------------------------------
# 4. Link to the target project (temporarily)
# ---------------------------------------------------------------------------
info "Linking to $PROJECT_NAME..."
cd "$REPO_ROOT"
supabase link --project-ref "$PROJECT_REF" 2>/dev/null

ok "Linked to $PROJECT_NAME"

# ---------------------------------------------------------------------------
# 5. Confirm for production
# ---------------------------------------------------------------------------
if [[ "$ENV" == "production" ]]; then
  echo ""
  warn "You are about to deploy functions to PRODUCTION."
  warn "Make sure these functions have been tested on staging first."
  echo ""
  read -p "Type 'production' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "production" ]]; then
    info "Aborted."
    exit 0
  fi
  echo ""
fi

# ---------------------------------------------------------------------------
# 6. Deploy functions
# ---------------------------------------------------------------------------
FAILED=()
SUCCEEDED=()

for fn in "${DEPLOY_FUNCTIONS[@]}"; do
  info "Deploying function: $fn..."
  if supabase functions deploy "$fn" --project-ref "$PROJECT_REF"; then
    ok "Deployed $fn"
    SUCCEEDED+=("$fn")
  else
    warn "Failed to deploy $fn"
    FAILED+=("$fn")
  fi
  echo ""
done

# ---------------------------------------------------------------------------
# 7. Summary
# ---------------------------------------------------------------------------
echo ""
if [[ ${#SUCCEEDED[@]} -gt 0 ]]; then
  ok "Successfully deployed (${#SUCCEEDED[@]}): ${SUCCEEDED[*]}"
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
  error "Failed to deploy (${#FAILED[@]}): ${FAILED[*]}"
fi

# ---------------------------------------------------------------------------
# 8. Re-link to production (restore default)
# ---------------------------------------------------------------------------
if [[ "$ENV" == "staging" ]]; then
  info "Re-linking to production project (default)..."
  supabase link --project-ref "$PRODUCTION_PROJECT_REF" 2>/dev/null
  ok "Restored link to Bragg-prod"
fi

echo ""
info "Done. Verify the functions in the Supabase dashboard:"
echo -e "  ${CYAN}https://supabase.com/dashboard/project/$PROJECT_REF/functions${NC}"
