# Bragg — Git Branching Strategy

---

## Branch Hierarchy

```
main
 │
 ├── epic/auth                          ← Epic 1: Authentication & User Profile
 │    ├── story/US-1.1-magic-link-signup
 │    ├── story/US-1.2-magic-link-signin
 │    ├── story/US-1.3-session-persistence
 │    ├── story/US-1.4-route-protection
 │    └── story/US-1.5-sign-out
 │
 ├── epic/groups                        ← Epic 2: Group Management
 │    ├── story/US-2.1-create-group
 │    ├── story/US-2.2-share-invite-link
 │    ├── story/US-2.3-join-group
 │    ├── story/US-2.4-approve-reject
 │    ├── story/US-2.5-re-request
 │    ├── story/US-2.6-remove-member
 │    ├── story/US-2.7-promote-admin
 │    ├── story/US-2.8-demote-admin
 │    ├── story/US-2.9-view-my-groups
 │    └── story/US-2.10-join-via-code
 │
 ├── epic/matches                       ← Epic 3: Match & Fixture Management
 │    ├── story/US-3.1-upcoming-matches
 │    ├── story/US-3.2-match-card
 │    └── story/US-3.3-group-home-states
 │
 ├── epic/predictions                   ← Epic 4: Predictions
 │    ├── story/US-4.1-submit-predictions
 │    ├── story/US-4.2-auto-seed-scenarios
 │    ├── story/US-4.3-scenario-input-types
 │    ├── story/US-4.4-partial-submission
 │    ├── story/US-4.5-quick-predict
 │    ├── story/US-4.6-edit-predictions
 │    ├── story/US-4.7-deadline-enforcement
 │    ├── story/US-4.8-pick-visibility
 │    ├── story/US-4.9-custom-scenario
 │    ├── story/US-4.10-approve-custom-scenario
 │    └── story/US-4.11-remove-scenario
 │
 ├── epic/leaderboard                   ← Epic 5: Leaderboard & Standings
 │    ├── story/US-5.1-match-leaderboard-post
 │    ├── story/US-5.2-match-leaderboard-live
 │    ├── story/US-5.3-expandable-row
 │    ├── story/US-5.4-season-standings
 │    ├── story/US-5.5-standings-filter
 │    ├── story/US-5.6-live-score-ticker
 │    └── story/US-5.7-on-track-indicators
 │
 ├── epic/resolution                    ← Epic 6: Result Resolution
 │    ├── story/US-6.1-manual-result-entry
 │    ├── story/US-6.2-resolve-custom-scenarios
 │    ├── story/US-6.3-auto-resolution-api
 │    └── story/US-6.4-abandoned-match
 │
 ├── epic/api-integration               ← Epic 7: API Integration & Cron
 │    ├── story/US-7.1-cricket-api-client
 │    ├── story/US-7.2-cron-edge-function
 │    ├── story/US-7.3-auto-lock
 │    └── story/US-7.4-fetch-playing-xi
 │
 ├── epic/multi-group                   ← Epic 8: Multi-Group Experience
 │    ├── story/US-8.1-multiple-membership
 │    ├── story/US-8.2-independent-predictions
 │    ├── story/US-8.3-group-switcher
 │    └── story/US-8.4-copy-picks
 │
 ├── epic/notifications                 ← Epic 9: Notifications
 │    ├── story/US-9.1-notification-bell
 │    ├── story/US-9.2-notification-types
 │    └── story/US-9.3-mark-read
 │
 ├── epic/admin                         ← Epic 10: Admin Panel
 │    ├── story/US-10.1-members-tab
 │    ├── story/US-10.2-scenarios-tab
 │    ├── story/US-10.3-settings-tab
 │    └── story/US-10.4-unified-admin
 │
 ├── epic/design-system                 ← Epic 11: UI/UX & Design System
 │    ├── story/US-11.1-nightscape-theme
 │    ├── story/US-11.2-typography
 │    ├── story/US-11.3-mobile-responsive
 │    ├── story/US-11.4-empty-states
 │    ├── story/US-11.5-error-states
 │    ├── story/US-11.6-animations
 │    ├── story/US-11.7-loading-states
 │    └── story/US-11.8-onboarding
 │
 ├── epic/legal                         ← Epic 12: Legal & Compliance
 │    ├── story/US-12.1-privacy-policy
 │    ├── story/US-12.2-terms-of-service
 │    └── story/US-12.3-footer-disclaimer
 │
 ├── epic/sharing                       ← Epic 13: Sharing & Virality
 │    ├── story/US-13.1-whatsapp-invite
 │    ├── story/US-13.2-leaderboard-image
 │    ├── story/US-13.3-streak-badges
 │    └── story/US-13.4-season-summary-card
 │
 └── epic/data-management               ← Epic 14: Data Management
      ├── story/US-14.1-seed-fixtures
      ├── story/US-14.2-seed-squads
      └── story/US-14.3-map-api-ids
```

---

## Branch Naming Convention

| Level | Pattern | Example |
|-------|---------|---------|
| Main | `main` | `main` |
| Epic | `epic/<epic-name>` | `epic/auth` |
| Story | `story/<story-id>-<short-desc>` | `story/US-1.1-magic-link-signup` |
| Hotfix | `hotfix/<short-desc>` | `hotfix/deadline-timezone-bug` |
| Infra | `infra/<short-desc>` | `infra/phase-0-scaffold` |

---

## Workflow Rules

### 1. Branch Creation

```bash
# Create epic branch from main
git checkout main
git pull origin main
git checkout -b epic/auth

# Create story branch from its parent epic
git checkout epic/auth
git checkout -b story/US-1.1-magic-link-signup
```

### 2. Story Development

- All development happens on `story/*` branches
- Never commit directly to `epic/*` or `main`
- Keep story branches focused — one story = one logical feature
- Commit frequently with clear messages

### 3. Story → Epic Merge

When a story is complete:

```bash
# Update epic branch first
git checkout epic/auth
git pull origin epic/auth

# Merge story into epic
git checkout epic/auth
git merge story/US-1.1-magic-link-signup

# Push epic
git push origin epic/auth

# Delete the story branch (optional, keeps things clean)
git branch -d story/US-1.1-magic-link-signup
```

- Resolve any conflicts during the merge into the epic branch
- After merge, verify the epic branch still works (build + manual test)

### 4. Epic → Main Merge

When all stories in an epic are complete and tested:

```bash
# Update main
git checkout main
git pull origin main

# Merge epic into main
git checkout main
git merge epic/auth

# Push main
git push origin main

# Delete the epic branch (optional)
git branch -d epic/auth
```

- All stories must be merged into the epic before the epic merges into main
- Test the full epic integration before merging to main
- Main should always be in a deployable state

### 5. Keeping Epic Branches Up-to-Date

When an earlier epic merges to main and a later epic is in progress:

```bash
# Update your epic with latest main
git checkout epic/predictions
git merge main
# Resolve any conflicts
git push origin epic/predictions
```

Do this after every epic→main merge to avoid large conflicts later.

---

## Merge Order (Respects Dependencies)

Epics must merge to main in dependency order. Some can run in parallel.

```
Phase 0 (Infra):
  infra/phase-0-scaffold ──────────────────────────────► main
                                                           │
Phase 1:                                                   │
  epic/design-system (US-11.1, 11.2) ─────────────────► main
                                                           │
  epic/auth ───────────────────────────────────────────► main
                                                           │
  epic/data-management (US-14.1) ──────────────────────► main
                                                           │
  epic/groups ─────────────────────────────────────────► main
                                                           │
  epic/legal (US-12.3 footer disclaimer) ───────────────► main
                                                           │
  epic/admin (US-10.1 members tab — P0) ───────────────► main
                                                           │
Phase 2:                                                   │
  epic/matches ────────────────────────────────────────► main
                                                           │
  epic/predictions ────────────────────────────────────► main
                                                           │
  epic/leaderboard (US-5.1, 5.4) ─────────────────────► main
                                                           │
  epic/resolution (US-6.1) ────────────────────────────► main
                                                           │
  epic/admin (US-10.2, 10.3 scenarios + settings) ─────► main
                                                           │
Phase 3:                                                   │
  epic/api-integration ────────────────────────────────► main
                                                           │
  epic/leaderboard (US-5.2, 5.6, 5.7) ────────────────► main
                                                           │
  epic/notifications ──────────────────────────────────► main
                                                           │
Phase 4:                                                   │
  epic/multi-group ────────────────────────────────────► main
                                                           │
  epic/design-system (US-11.3-11.8: responsive, empty/error/loading states, animations, onboarding) ► main
                                                           │
  epic/sharing ────────────────────────────────────────► main
                                                           │
  epic/legal (US-12.1, 12.2) ─────────────────────────► main
```

**Note:** Some epics merge incrementally — e.g., `epic/design-system` merges its P0 stories (theme, typography) in Phase 1, then its P1/P2 stories (empty states, animations) in Phase 4. In practice, cut a new epic branch from latest main each time:

```bash
# Phase 1 — merge core design system
git checkout main && git merge epic/design-system && git push

# Phase 4 — start new design-system branch for polish stories
git checkout main && git checkout -b epic/design-system-polish
```

---

## Parallel Development Tracks

When multiple developers are working (or when using parallel agents), these epic groups are independent and can be worked on simultaneously:

| Track A | Track B | Track C |
|---------|---------|---------|
| epic/auth | epic/design-system | epic/data-management |
| epic/groups | epic/legal | epic/data-management |
| epic/predictions | epic/matches | epic/admin |
| epic/leaderboard | epic/notifications | epic/api-integration |

---

## Special Branches

### `infra/phase-0-scaffold`

The initial project setup. Cut from `main`, merged to `main` first:

- Next.js 16.2 scaffold with TypeScript, Tailwind v4, App Router
- shadcn/ui setup with Stadium Nightscape theme
- Supabase client setup (browser + server)
- `proxy.ts` skeleton (auth session management)
- `globals.css` with design tokens
- Font loading (Chakra Petch, DM Sans, JetBrains Mono)
- Base root layout
- Data Access Layer stubs (`src/lib/dal/` — all 9 modules)
- Cricket API abstraction (`src/lib/cricket-api/` — index, client, mock, types)
- Mock data fixtures (`src/lib/mock-data/` — matches, squads, scorecards)
- Supabase migration files (001-005)
- `supabase/seed.sql` (test users, groups, matches, predictions)
- Type definitions (`src/types/`)
- Constants file, validators, utils
- `.env.local.example` (with `NEXT_PUBLIC_MOCK_MODE` flag)
- Local dev environment verified (`supabase start` + `supabase db reset`)

This is the foundation all epic branches depend on. **Must merge to main before any epic branch is created.**

### `hotfix/*`

For urgent production bugs during the IPL season:

```bash
# Cut from main
git checkout main
git checkout -b hotfix/deadline-timezone-bug

# Fix, test, merge directly to main
git checkout main
git merge hotfix/deadline-timezone-bug
git push origin main
```

After merging a hotfix to main, rebase any in-progress epic branches:
```bash
git checkout epic/predictions
git merge main
```

---

## Commit Message Convention

```
<type>(<scope>): <short description>

<optional body>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructure without feature change
- `style` — Design/CSS changes
- `chore` — Config, deps, tooling
- `docs` — Documentation
- `seed` — Data seeding scripts

**Scope** = story ID or component name:

```
feat(US-1.1): implement magic link signup form
fix(US-4.7): enforce deadline check server-side
style(US-11.1): apply nightscape theme tokens
chore(infra): scaffold next.js 16.2 project
seed(US-14.1): add first 14 IPL 2026 fixtures
```

---

## Database Migrations in Branches

Migration files live in `supabase/migrations/`. Rules:

1. **Phase 0 scaffold** creates the initial migration files (001-005). These merge to main first.
2. **Story branches that need schema changes** add a NEW migration file with the next sequence number (e.g., `006_add_players_table.sql`). Never edit existing migration files in other branches.
3. **When merging a story → epic**, if two stories created migrations with the same number, rename one to the next available number before merging.
4. **Epic → main merges** should verify all migrations run cleanly in sequence: `supabase db reset` on a clean DB.
5. **Seed data changes** (fixtures, teams, players) go in `004_seed_data.sql` during Phase 0, or as new migration files (`007_seed_week2_fixtures.sql`) during the season.

---

## Quick Reference — Full Branch List

```
main
infra/phase-0-scaffold

epic/auth
  story/US-1.1-magic-link-signup
  story/US-1.2-magic-link-signin
  story/US-1.3-session-persistence
  story/US-1.4-route-protection
  story/US-1.5-sign-out

epic/groups
  story/US-2.1-create-group
  story/US-2.2-share-invite-link
  story/US-2.3-join-group
  story/US-2.4-approve-reject
  story/US-2.5-re-request
  story/US-2.6-remove-member
  story/US-2.7-promote-admin
  story/US-2.8-demote-admin
  story/US-2.9-view-my-groups
  story/US-2.10-join-via-code

epic/matches
  story/US-3.1-upcoming-matches
  story/US-3.2-match-card
  story/US-3.3-group-home-states

epic/predictions
  story/US-4.1-submit-predictions
  story/US-4.2-auto-seed-scenarios
  story/US-4.3-scenario-input-types
  story/US-4.4-partial-submission
  story/US-4.5-quick-predict
  story/US-4.6-edit-predictions
  story/US-4.7-deadline-enforcement
  story/US-4.8-pick-visibility
  story/US-4.9-custom-scenario
  story/US-4.10-approve-custom-scenario
  story/US-4.11-remove-scenario

epic/leaderboard
  story/US-5.1-match-leaderboard-post
  story/US-5.2-match-leaderboard-live
  story/US-5.3-expandable-row
  story/US-5.4-season-standings
  story/US-5.5-standings-filter
  story/US-5.6-live-score-ticker
  story/US-5.7-on-track-indicators

epic/resolution
  story/US-6.1-manual-result-entry
  story/US-6.2-resolve-custom-scenarios
  story/US-6.3-auto-resolution-api
  story/US-6.4-abandoned-match

epic/api-integration
  story/US-7.1-cricket-api-client
  story/US-7.2-cron-edge-function
  story/US-7.3-auto-lock
  story/US-7.4-fetch-playing-xi

epic/multi-group
  story/US-8.1-multiple-membership
  story/US-8.2-independent-predictions
  story/US-8.3-group-switcher
  story/US-8.4-copy-picks

epic/notifications
  story/US-9.1-notification-bell
  story/US-9.2-notification-types
  story/US-9.3-mark-read

epic/admin
  story/US-10.1-members-tab
  story/US-10.2-scenarios-tab
  story/US-10.3-settings-tab
  story/US-10.4-unified-admin

epic/design-system
  story/US-11.1-nightscape-theme
  story/US-11.2-typography
  story/US-11.3-mobile-responsive
  story/US-11.4-empty-states
  story/US-11.5-error-states
  story/US-11.6-animations
  story/US-11.7-loading-states
  story/US-11.8-onboarding

epic/legal
  story/US-12.1-privacy-policy
  story/US-12.2-terms-of-service
  story/US-12.3-footer-disclaimer

epic/sharing
  story/US-13.1-whatsapp-invite
  story/US-13.2-leaderboard-image
  story/US-13.3-streak-badges
  story/US-13.4-season-summary-card

epic/data-management
  story/US-14.1-seed-fixtures
  story/US-14.2-seed-squads
  story/US-14.3-map-api-ids
```

---

*Last updated: March 26, 2026*
