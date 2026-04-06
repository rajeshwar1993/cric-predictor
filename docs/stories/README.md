# Bragg — User Stories

This folder contains detailed, actionable user stories derived from [`../PRD.V2.md`](../PRD.V2.md). Each story has a clear Definition of Done and can be completed in a few hours to a few days. Stories reference the PRD — the PRD remains the source of truth.

## How to read a story

Every story follows this template:

```markdown
### STORY-ID: Title

**Phase:** Phase number and name
**Priority:** P0 (blocker) / P1 (important) / P2 (nice-to-have)
**Estimated effort:** Small (< 1 day) / Medium (1–3 days) / Large (3–5 days)
**Status:** Not started / In progress / Blocked / Complete

**User story** — "As a... I want to... So that..."
**Context / Why** — Why this matters
**Acceptance criteria** — Testable checklist
**Out of scope** — What other stories cover
**Dependencies** — Stories that must finish first
**Blocks** — Stories that can't start until this is done
**PRD references** — Links to relevant PRD sections
**Technical notes** — File paths, library decisions, implementation hints
**Analytics events** — PostHog events to fire
**Unit tests** — Required test coverage
**Test plan** — Manual QA script
**Open questions** — Things to resolve
```

## Phase overview

| Phase | Focus | Goal |
|-------|-------|------|
| [Phase 0: Foundation](./phase-0-foundation.md) | Project setup, DB schema, migrations | Empty app running on STG with schema deployed |
| [Phase 1: Auth & Onboarding](./phase-1-auth.md) | Sign-in, onboarding, terms, shared UI | User can sign in, complete onboarding, see empty dashboard |
| Phase 2: Gangs | Create, join, settings, delete | User can create gang, invite friends, manage members |
| Phase 3: Match sync | Sportmonks sync, scenario seeding | Fixtures appear on gang pages, scenarios available per gang |
| Phase 4: Predictions | Predict page, submission, deadline | User can make predictions; deadline enforced |
| Phase 5: Live resolution | Live polling, scenario resolution, standings | Scenarios resolve during match; standings update |
| Phase 6: Leaderboards | Match leaderboard, season standings, profile | User can view all leaderboards and their own stats |
| Phase 7: Notifications | Bell, side panel, deadline reminders | User receives in-app notifications |
| Phase 8: Polish | Error pages, edge cases, final touches | Production-ready quality |

## Story ID format

`{AREA}-{TYPE}-{NUMBER}` where:

- **AREA** — Feature area: `FND` (foundation), `AUTH`, `GANG`, `SYNC`, `PRED`, `LIVE`, `LB` (leaderboards), `NOTIF`, `POL` (polish)
- **TYPE** — Work type (optional): `DB` (database), `API` (server action/RPC), `CRON` (edge function/cron), `UI` (component/page), `MW` (middleware)
- **NUMBER** — Sequential within the area+type

Examples:
- `FND-001` — Foundation, story 1
- `AUTH-DB-001` — Auth database story, 1
- `AUTH-UI-001` — Auth UI story, 1
- `GANG-API-003` — Gang server action, story 3

## Priority levels

- **P0** — Blocker for launch. Must ship.
- **P1** — Important for launch. Ship if possible.
- **P2** — Nice to have. Ship post-launch.

## Status legend

- `Not started` — no work begun
- `In progress` — actively being worked on
- `Blocked` — waiting on a dependency or open question
- `Complete` — merged and verified

## Tracking

Update the Status field on each story as work progresses. Link the PR that closes each story in the commit message (e.g., `Closes AUTH-UI-001`).

## Global UI story requirements

The following requirements apply to **every UI story** (any story with ID pattern `*-UI-*` or any story that ships a user-facing component/page). They are normative and do not need to be repeated in each story's acceptance criteria — treat them as implicit Definition of Done for UI work:

1. **Storybook story required.** Every component and page story in phases 1–8 must ship a matching Storybook story file alongside the component:
   - Location: `web-app-2/src/components/**/*.stories.tsx` (for components) or `web-app-2/src/app/**/*.stories.tsx` (for pages)
   - Must include a `Default` story plus stories for every key variant/state the component handles (e.g., `Loading`, `Empty`, `Error`, `WithData`, `Disabled`, `Pending`, `Admin`, `Member`, `NotLoggedIn`, etc. — whichever apply)
   - Uses Storybook Controls (`argTypes`) for every meaningful prop so designers/reviewers can toggle states
   - Mocked data lives in `src/components/**/*.mocks.ts` (or inline in the story file for trivial cases)
   - Storybook renders with dark mode applied (matching the app default)
   - If the component depends on auth or Supabase data, the Storybook story uses a mocked client / hardcoded props (no real network calls)
2. **Design system source of truth.** UI work must conform to `docs/design-system.md` (spec) and `docs/design-system-visual.html` (rendered visual reference). Consult both: the spec for token values and rules, the visual HTML for what it should look like. If a UI story needs a primitive/pattern not in the design system, flag it to the user — do not invent ad-hoc styles.
3. **Reuse before creating.** Always check `src/components/ui/` and `src/components/` for existing components before creating new ones (per CLAUDE.md).
4. **Accessibility.** Semantic HTML, ARIA labels, keyboard navigation. Run axe-core against the Storybook story; no critical violations.
5. **Mobile-first.** Every component must render correctly at `375px` width (iPhone SE) before expanding to tablet/desktop.

When a UI story's implementation is reviewed, missing any of the above is a review blocker.

## Implementation order

Stories listed in dependency order. Within each step, stories separated by `∥` can be done in parallel. Complete all stories in a step before moving to the next.

> **Blockers to clear before starting Phase 0:**
> 1. ~~Author new `docs/design-system.md`~~ — **DONE** (`docs/design-system.md` + `docs/design-system-visual.html` authored)
> 2. ~~Fetch live Sportmonks IPL 2026 IDs~~ — **DONE** (verified live 2026-04-06, see `docs/sportmonks-seed-ids.md`)
>
> **All blockers cleared. Phase 0 is ready to start.**

**94 stories across 43 steps.**

---

### Phase 0 — Foundation (12 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 1 | FND-001 | Project folder scaffolding (`web-app-2/`, `supabase-2/`) |
| 2 | FND-002 ∥ FND-003 | Next.js init + Supabase project init |
| 3 | FND-004 ∥ FND-DB-001 | Supabase clients (server, client, middleware, service-role) ∥ Schema migration (19 tables, 7 enums) |
| 4 | FND-005 ∥ FND-DB-002 ∥ FND-DB-003 | PostHog analytics ∥ RLS policies ∥ Database indexes |
| 5 | FND-006 ∥ FND-DB-004 | Design system + Storybook ∥ Triggers & stored procs |
| 6 | FND-DB-005 | Seed reference data (sport, league, season, teams, scenarios). **Blocked on Sportmonks IDs** |
| 7 | FND-DB-006 | v1 → v2 data migration |

> **Milestone:** Empty app running on STG with complete schema + migrated data

---

### Phase 1 — Auth & Onboarding (18 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 8 | AUTH-API-001 ∥ AUTH-API-003 ∥ AUTH-API-005 ∥ AUTH-DB-001 | Magic link action ∥ Sign out action ∥ Accept terms action ∥ delete_account RPC |
| 9 | AUTH-API-002 ∥ AUTH-API-004 ∥ AUTH-API-006 | Auth callback ∥ Complete onboarding action ∥ Delete account action |
| 10 | AUTH-MW-001 | Auth + onboarding + terms middleware |
| 11 | AUTH-UI-005 ∥ AUTH-UI-006 ∥ AUTH-UI-009 ∥ AUTH-UI-010 | Footer ∥ Destructive action dialog ∥ 404 page ∥ Error page |
| 12 | AUTH-UI-001 ∥ AUTH-UI-003 ∥ AUTH-UI-004 | Login page ∥ Accept terms page ∥ Global nav bar |
| 13 | AUTH-UI-002 ∥ AUTH-UI-007 ∥ AUTH-UI-008 | Onboarding page ∥ Privacy policy ∥ Terms & conditions |

> **Milestone:** User can sign in, onboard, accept terms, and see empty dashboard

---

### Phase 2 — Gangs (22 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 14 | GANG-DB-001 | Scenario seeding Postgres function |
| 15 | GANG-DB-002 ∥ GANG-DB-003 | create_gang RPC ∥ delete_gang RPC |
| 16 | GANG-API-001 ∥ GANG-API-002 ∥ GANG-API-003 ∥ GANG-API-004 ∥ GANG-API-005 ∥ GANG-API-006 | All 6 gang server actions (create, join, member mgmt, leave, delete, settings) |
| 17 | GANG-UI-002 ∥ GANG-UI-003 ∥ GANG-UI-004 ∥ GANG-UI-006 ∥ GANG-UI-007 ∥ GANG-UI-008 ∥ GANG-UI-009 ∥ GANG-UI-010 ∥ GANG-UI-013 | All standalone gang components (9 in parallel) |
| 18 | GANG-UI-001 ∥ GANG-UI-005 | Dashboard page ∥ Gang page shell (compose step 17 components) |
| 19 | GANG-UI-011 ∥ GANG-UI-012 | Join page ∥ Gang settings page |

> **Milestone:** User can create gang, invite friends, join via link, manage members

---

### Phase 3 — Match Sync (5 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 20 | SYNC-LIB-001 | Sportmonks API client module |
| 21 | SYNC-CRON-001 | Daily fixture + player sync cron |
| 22 | SYNC-CRON-002 ∥ SYNC-CRON-003 ∥ SYNC-UI-001 | Pre-match delta sync ∥ Scenario seeding cron ∥ Upcoming matches section on gang page |

> **Milestone:** Fixtures appear on gang pages, scenarios seeded per gang

---

### Phase 4 — Predictions (10 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 23 | PRED-DAL-001 | Prediction & scenario DAL functions |
| 24 | PRED-API-001 ∥ PRED-UI-004 ∥ PRED-UI-005 ∥ PRED-UI-006 ∥ PRED-UI-007 | Submit action ∥ Team pick ∥ Player pick ∥ Range input ∥ Yes/No input |
| 25 | PRED-UI-003 | Scenario card (wraps input components from step 24) |
| 26 | PRED-UI-002 | Prediction form (composes scenario cards) |
| 27 | PRED-UI-001 ∥ PRED-UI-008 | Predict page shell ∥ Prediction status indicator on gang page |

> **Milestone:** User can make predictions for upcoming matches; deadline enforced

---

### Phase 5 — Live Resolution (6 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 28 | LIVE-LIB-001 ∥ LIVE-DB-001 | Sportmonks response parser + extractors ∥ Scenario resolution Postgres functions |
| 29 | LIVE-CRON-001 | Live poll + resolve cron (15s) |
| 30 | LIVE-UI-001 | Live scorecard component |
| 31 | LIVE-UI-002 ∥ LIVE-UI-003 | Gang page live matches section ∥ Gang page recent results section |

> **Milestone:** Scenarios resolve during live matches; standings update automatically

---

### Phase 6 — Leaderboards & Profile (8 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 32 | LB-DAL-001 ∥ LB-API-001 | Leaderboard DAL ∥ Update profile action |
| 33 | LB-UI-002 ∥ LB-UI-003 | Match leaderboard table ∥ Prediction reveal table |
| 34 | LB-UI-001 ∥ LB-UI-004 ∥ LB-UI-005 ∥ LB-UI-006 | Match leaderboard page ∥ Season standings page ∥ Profile page ∥ Member list points update |

> **Milestone:** Full leaderboard stack — match, season, profile, gang member list

---

### Phase 7 — Notifications (5 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 35 | NOTIF-DAL-001 ∥ NOTIF-CRON-001 | Notifications DAL ∥ Deadline reminders cron |
| 36 | NOTIF-API-001 | Mark as read / mark all as read actions |
| 37 | NOTIF-UI-002 | Notification item component |
| 38 | NOTIF-UI-001 | Notification bell side panel (replaces placeholder from AUTH-UI-004) |

> **Milestone:** In-app notifications live — bell, side panel, deadline reminders

---

### Phase 8 — Polish & Launch (8 stories)

| Step | Stories | What gets done |
|------|---------|----------------|
| 39 | POL-UI-001 ∥ POL-UI-002 ∥ POL-UI-003 ∥ POL-SEC-001 | Landing page ∥ Loading skeletons ∥ Error boundaries ∥ Rate limiting |
| 40 | POL-UI-004 | SEO meta tags + Open Graph |
| 41 | POL-OPS-001 | STG deploy + environment validation |
| 42 | POL-QA-001 | E2E smoke tests (Playwright) |
| 43 | POL-LAUNCH-001 | Launch readiness checklist |

> **Milestone:** Production-ready. **LAUNCH.**
