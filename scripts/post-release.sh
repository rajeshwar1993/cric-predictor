#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# post-release.sh — Post-merge release script
#
# Run this after your PR has been merged into main.
# It creates a git tag, GitHub release, and resets staging.
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
WEB_APP_DIR="$REPO_ROOT/web-app"
PKG_JSON="$WEB_APP_DIR/package.json"

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Switch to main and pull latest
# ---------------------------------------------------------------------------
info "Switching to main and pulling latest..."
git checkout main
git pull origin main

ok "On latest main"

# ---------------------------------------------------------------------------
# 2. Read version from package.json
# ---------------------------------------------------------------------------
VERSION=$(jq -r '.version' "$PKG_JSON")
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  error "Tag $TAG already exists. Has this release already been completed?"
fi

info "Creating release for $TAG"

# ---------------------------------------------------------------------------
# 3. Create git tag
# ---------------------------------------------------------------------------
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"

ok "Tag $TAG created and pushed"

# ---------------------------------------------------------------------------
# 4. Create GitHub release
# ---------------------------------------------------------------------------
info "Creating GitHub release..."
gh release create "$TAG" \
  --title "Release $TAG" \
  --generate-notes

ok "GitHub release created"

# ---------------------------------------------------------------------------
# 5. Check staging for unmerged work
# ---------------------------------------------------------------------------
git fetch origin staging --quiet 2>/dev/null || true

if git rev-parse origin/staging >/dev/null 2>&1; then
  STAGING_AHEAD=$(git rev-list --count origin/main..origin/staging 2>/dev/null || echo "0")

  if [[ "$STAGING_AHEAD" -gt 0 ]]; then
    echo ""
    warn "Staging has $STAGING_AHEAD commit(s) not in main!"
    warn "These commits will be lost when staging is reset:"
    echo ""
    git log --oneline origin/main..origin/staging
    echo ""
    read -p "Continue with staging reset? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      info "Skipping staging reset. You can reset it manually later:"
      echo "  git checkout staging && git reset --hard main && git push origin staging --force"
      exit 0
    fi
  fi

  # ---------------------------------------------------------------------------
  # 6. Reset staging to match main
  # ---------------------------------------------------------------------------
  info "Resetting staging to match main..."
  git checkout staging
  git reset --hard main
  git push origin staging --force

  ok "Staging reset to match main"
  git checkout main
else
  warn "No remote staging branch found. Skipping staging reset."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
ok "Release $TAG complete!"
echo ""
echo -e "  Tag:     ${CYAN}$TAG${NC}"
echo -e "  Release: ${CYAN}https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/releases/tag/$TAG${NC}"
