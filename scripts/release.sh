#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# release.sh — Pre-merge release script
#
# Run this on a feature/ or bugfix/ branch after testing on staging.
# It verifies the build, bumps the version, and creates a PR to main.
#
# Flags:
#   --skip-tests    Skip running tests and build verification
# =============================================================================

SKIP_TESTS=false
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
  esac
done

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
# 1. Validate branch
# ---------------------------------------------------------------------------
BRANCH=$(git branch --show-current)

if [[ "$BRANCH" == "main" || "$BRANCH" == "staging" ]]; then
  error "You must be on a feature/ or bugfix/ branch, not '$BRANCH'."
fi

if [[ "$BRANCH" == feature/* ]]; then
  BUMP_TYPE="minor"
elif [[ "$BRANCH" == bugfix/* ]]; then
  BUMP_TYPE="patch"
else
  error "Branch '$BRANCH' doesn't match feature/* or bugfix/* naming convention."
fi

info "Branch: $BRANCH (will bump $BUMP_TYPE version)"

# ---------------------------------------------------------------------------
# 2. Check for uncommitted changes
# ---------------------------------------------------------------------------
if [[ -n "$(git status --porcelain)" ]]; then
  error "Working directory is not clean. Commit or stash your changes first."
fi

ok "Working directory clean"

# ---------------------------------------------------------------------------
# 3. Check branch is up-to-date with main
# ---------------------------------------------------------------------------
git fetch origin main --quiet

LOCAL_MAIN=$(git rev-parse origin/main)
MERGE_BASE=$(git merge-base HEAD origin/main)

if [[ "$LOCAL_MAIN" != "$MERGE_BASE" ]]; then
  warn "Your branch is behind main. Rebase before releasing."
  echo ""
  echo "  git rebase origin/main"
  echo ""
  read -p "Do you want to rebase now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git rebase origin/main || error "Rebase failed. Resolve conflicts and try again."
    ok "Rebased on main"
  else
    error "Cannot create release PR while behind main."
  fi
fi

ok "Branch is up-to-date with main"

# ---------------------------------------------------------------------------
# 4. Run tests and verify build
# ---------------------------------------------------------------------------
if [[ "$SKIP_TESTS" == true ]]; then
  warn "Skipping tests and build verification (--skip-tests)"
else
  info "Running tests..."
  cd "$WEB_APP_DIR"
  npm run test:run || error "Tests failed. Fix them before releasing."
  ok "All tests passed"

  info "Verifying build..."
  npm run build || error "Build failed. Fix build errors before releasing."
  ok "Build passed"
  cd "$REPO_ROOT"
fi

# ---------------------------------------------------------------------------
# 6. Bump version
# ---------------------------------------------------------------------------
CURRENT_VERSION=$(jq -r '.version' "$PKG_JSON")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

if [[ "$BUMP_TYPE" == "minor" ]]; then
  MINOR=$((MINOR + 1))
  PATCH=0
elif [[ "$BUMP_TYPE" == "patch" ]]; then
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
info "Version: $CURRENT_VERSION → $NEW_VERSION"

jq --arg v "$NEW_VERSION" '.version = $v' "$PKG_JSON" > "$PKG_JSON.tmp" && mv "$PKG_JSON.tmp" "$PKG_JSON"

# ---------------------------------------------------------------------------
# 7. Commit and push version bump
# ---------------------------------------------------------------------------
git add "$PKG_JSON"
git commit -m "chore: bump version to $NEW_VERSION"
git push origin "$BRANCH"

ok "Version bumped and pushed"

# ---------------------------------------------------------------------------
# 8. Create PR
# ---------------------------------------------------------------------------
FEATURE_NAME="${BRANCH#feature/}"
FEATURE_NAME="${FEATURE_NAME#bugfix/}"

info "Creating pull request..."

PR_URL=$(gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "Release v$NEW_VERSION — $FEATURE_NAME" \
  --body "$(cat <<EOF
## Release v$NEW_VERSION

**Branch**: \`$BRANCH\`
**Version bump**: $BUMP_TYPE ($CURRENT_VERSION → $NEW_VERSION)

### Checklist
- [x] Tests pass
- [x] Build passes
- [x] Tested on staging
- [ ] Supabase migrations deployed to production (if applicable)
EOF
)")

echo ""
ok "Pull request created!"
echo -e "  ${CYAN}$PR_URL${NC}"
echo ""
info "Next steps:"
echo "  1. Review and merge the PR on GitHub"
echo "  2. After merge, run: npm run post-release"
