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
