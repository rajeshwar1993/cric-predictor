# Phase 2 — Gangs

**Goal:** Users can create gangs, invite friends, join gangs via invite code or link, manage gang settings, approve/reject/remove/block members, leave gangs, and delete gangs. Dashboard shows gangs list; Gang page shows header, member list, and placeholders for matches (actual match data comes in Phase 3).

**Exit criteria:**
- User can create a gang and see it on Dashboard
- User can share an invite link; another user can click it, sign in, and join
- Auto-accept vs manual approval both work
- Admin can approve/reject/remove/block/unblock members
- Admin can edit gang settings (name, auto-accept, prediction deadline)
- Admin can delete gang (soft-delete with member notifications)
- Members can leave a gang (not admin)
- Max 20 members and max 40 gangs enforced
- All destructive actions use the type-to-confirm dialog

---

## GANG-DB-001: Scenario seeding Postgres function

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want a reusable Postgres function that seeds scenarios for a given (gang, fixture) pair from the scenario templates,
> So that both the `create_gang` RPC and the `seed-scenarios` cron share the same logic without duplication.

**Context / Why:**
Scenario seeding is used in two places: (1) gang creation (for existing upcoming fixtures in the 14-hour window), (2) the 30-minute cron that catches newly-in-window fixtures. A shared function prevents drift.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/007_seed_scenarios_function.sql`
- [ ] Function: `seed_fixture_scenarios_for_gang(p_gang_id UUID, p_fixture_id UUID) RETURNS VOID`
- [ ] Implementation:
  1. Look up the fixture to get `home_team_id`, `away_team_id` → fetch team short codes from `v2_league_teams`
  2. Look up `v2_seasons` via `fixture.season_id` → get `league_id`
  3. For each row in `v2_scenario_templates` where `is_active = true` AND `sport_id` matches the league's sport:
     - Replace `{Home Team}` / `{Away Team}` placeholders in `title` with real team codes
     - INSERT into `v2_fixture_scenarios` with copied template values (template_id, league_id, season_id, fixture_id, gang_id, slug, title, input_type, options, points, resolution_phase)
     - Use `ON CONFLICT (gang_id, fixture_id, slug) DO NOTHING` for idempotency
  4. Single transaction per call (atomic — either all template rows insert or none)
- [ ] Marked `SECURITY DEFINER` (writes bypass RLS)
- [ ] Raises exception if fixture not found
- [ ] Helper: `seed_fixture_scenarios_for_all_active_gangs(p_fixture_id UUID) RETURNS VOID` — calls the per-gang function for every non-deleted active gang enrolled in the fixture's season

**Out of scope:**
- The cron that invokes this function (SYNC-CRON-003 in Phase 3)
- The `create_gang` RPC that calls it (GANG-DB-002)

**Dependencies:** FND-DB-001 through FND-DB-005 (schema, RLS, seed data including `v2_scenario_templates`)
**Blocks:** GANG-DB-002, SYNC-CRON-003

**PRD references:**
- [seed-scenarios](../PRD.V2.md#seed-scenarios--scenario-seeding-per-gang-per-fixture)
- [v2_fixture_scenarios](../PRD.V2.md#v2_fixture_scenarios--prediction-questions-for-a-fixture-seeded-from-templates)
- [Scenarios § Structure](../PRD.V2.md#scenarios)

**Technical notes:**
- Placeholder replacement: `REPLACE(REPLACE(t.title, '{Home Team}', home_team.code), '{Away Team}', away_team.code)`
- `v2_scenario_templates` filter uses `is_active = true` — `total_match_catches` is excluded
- Idempotent via unique constraint on `(gang_id, fixture_id, slug)`

**Analytics events:** None (DB function)

**Unit tests:**
- [ ] Seeds correct number of active templates (19 for IPL)
- [ ] Skips inactive templates (`total_match_catches`)
- [ ] Re-running is no-op (ON CONFLICT)
- [ ] Placeholders replaced correctly (no `{Home Team}` in resulting titles)
- [ ] Missing fixture raises exception
- [ ] `seed_fixture_scenarios_for_all_active_gangs` filters out deleted gangs
- [ ] Excludes gangs where `v2_gang_league_seasons.is_active = false`

**Test plan:**
- [ ] Call function with a real gang + fixture, verify 19 scenarios inserted
- [ ] Call again, verify no duplicates
- [ ] Spot-check titles: home/away team codes substituted

**Open questions:** None

---

---

## GANG-DB-002: create_gang RPC

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want a single Postgres RPC that creates a gang, enrolls it in the active season, seeds scenarios, and returns the new gang id in one transaction,
> So that gang creation is atomic and can't leave orphan rows.

**Context / Why:**
Per PRD Implementation Plan, gang creation must be a single RPC (server actions can't share transactions with separate RPC calls). Everything happens in one `BEGIN ... COMMIT` block.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/008_create_gang_rpc.sql`
- [ ] RPC: `create_gang(gang_name TEXT, creator_id UUID) RETURNS UUID`
- [ ] Implementation (all in one transaction):
  1. Validate `gang_name` length (3–50 chars); raise exception `P0001` with `INVALID_GANG_NAME` prefix otherwise
  2. Generate a unique 6-char invite code (uppercase letters + numbers); retry up to 5 times on collision; raise exception on exhaustion
  3. INSERT into `v2_gangs` (`id`, `name`, `invite_code`, `created_by = creator_id`, `auto_accept = false`, `is_deleted = false`)
  4. INSERT into `v2_gang_members` (`gang_id`, `user_id = creator_id`, `role = 'admin'`, `status = 'approved'`, `requested_at = now()`, `approved_at = now()`)
  5. Find the active IPL 2026 season: `SELECT id, league_id FROM v2_seasons WHERE is_active = true LIMIT 1`
  6. INSERT into `v2_gang_league_seasons` (`gang_id`, `league_id`, `season_id`, `prediction_deadline_mins = 45`, `is_active = true`)
  7. For each fixture where `start_datetime - INTERVAL '14 hours' <= now() AND start_datetime > now() AND status = 'upcoming'` in the season → call `seed_fixture_scenarios_for_gang(new_gang_id, fixture_id)` from GANG-DB-001
  8. RETURN the new gang id
- [ ] Marked `SECURITY DEFINER` to bypass RLS on writes
- [ ] Uses advisory lock on creator_id to prevent concurrent max-gangs races
- [ ] Helper function `generate_invite_code()` creates a 6-char uppercase alphanumeric string

**Out of scope:**
- Scenario seeding logic (GANG-DB-001)
- Server action wrapper (GANG-API-001)

**Dependencies:** GANG-DB-001, FND-DB-001 through FND-DB-005
**Blocks:** GANG-API-001

**PRD references:**
- [Implementation Plan § Supabase-2 migration files](../PRD.V2.md#supabase-2-migration-files)
- [seed-scenarios cron § Also triggered by](../PRD.V2.md#seed-scenarios--scenario-seeding-per-gang-per-fixture)
- [Gangs § Creation](../PRD.V2.md#gangs)
- [v2_fixture_scenarios](../PRD.V2.md#v2_fixture_scenarios--prediction-questions-for-a-fixture-seeded-from-templates)

**Technical notes:**
- Invite code generation: use `chr(ascii('A') + floor(random() * 26))` plus digits in a loop
- Use `ON CONFLICT (invite_code) DO NOTHING RETURNING id` trick for collision detection
- Active season lookup can be cached in a local variable
- Scenario seeding uses `ON CONFLICT (gang_id, fixture_id, slug) DO NOTHING` for idempotency
- Triggers from FND-DB-004 (max_members, max_gangs, etc.) fire automatically

**Analytics events:** None (fired by server action)

**Unit tests:**
- [ ] Valid input creates gang, member, gang_league_seasons rows, and seeds scenarios
- [ ] Invalid gang name (too short/long) raises exception
- [ ] Invite code collision retries and succeeds
- [ ] Second call with same creator succeeds (creates different gang)
- [ ] Concurrent calls don't create duplicate gangs at max-gangs limit
- [ ] If no active season exists, raises clear error
- [ ] Rollback on any failure: no orphan rows left behind

**Test plan:**
- [ ] Call RPC with a test user, verify all expected rows created
- [ ] Force an error mid-transaction (e.g., invalid team placeholder) and verify rollback

**Open questions:** None

---

## GANG-API-001: createGang server action

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want to submit a gang name and get back a newly created gang,
> So that I can start a gang for my friend group.

**Context / Why:**
Thin wrapper around the RPC — handles auth check, input validation, error mapping, and analytics.

**Acceptance criteria:**
- [ ] Server action `createGang(name: string): Promise<{ success: true, gangId: string } | { success: false, error: string }>` in `src/lib/actions/gangs.ts`
- [ ] Requires authenticated user (error if not)
- [ ] Client-side input: trims name, validates 3–50 chars (server re-validates)
- [ ] Calls RPC `create_gang(name, auth.uid())`
- [ ] Error mapping:
  - `MAX_GANGS_REACHED` → "You've reached the maximum number of gangs (40)"
  - `INVALID_GANG_NAME` → "Gang name must be 3–50 characters"
  - Invite code collision exhaustion → "Couldn't create your gang — please try again"
  - Other errors → generic fallback message
- [ ] On success, fires PostHog event `GANG_CREATED` with `{ gang_id, name_length }`
- [ ] Returns the new gang id so UI can redirect to `/group/{gangId}`
- [ ] Calls `revalidatePath('/dashboard')` after success

**Out of scope:** RPC implementation (GANG-DB-002), UI form (GANG-UI-002)

**Dependencies:** GANG-DB-002, FND-004, FND-005
**Blocks:** GANG-UI-002

**PRD references:**
- [Gangs § Creation](../PRD.V2.md#gangs)
- [Error Handling](../PRD.V2.md#error-handling--retries)

**Technical notes:**
- Use `createClient()` (server) — not service role — so RLS still applies to auth check
- The RPC itself uses SECURITY DEFINER so writes bypass RLS
- `"use server"` directive

**Analytics events:**
- `GANG_CREATED` — `{ gang_id: uuid, name_length: number }`, distinct_id: user.id

**Unit tests:**
- [ ] Valid name → RPC called with correct args, returns gang id
- [ ] Name too short → returns error, RPC not called
- [ ] Name too long → returns error
- [ ] RPC throws MAX_GANGS_REACHED → mapped error returned
- [ ] Unauthenticated → returns "not authenticated" error
- [ ] PostHog event fires on success

**Test plan:**
- [ ] Create a gang via test harness, verify redirect and row in DB
- [ ] Try creating 41 gangs, verify error on 41st

**Open questions:** None

---

## GANG-API-002: joinGang server action

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As an authenticated user with an invite code,
> I want to request to join a gang,
> So that I can predict matches with my friends.

**Context / Why:**
Handles both auto-accept gangs (immediate join) and manual-approval gangs (pending request). Also handles rejoin case (previously left/removed member).

**Acceptance criteria:**
- [ ] Server action `joinGang(inviteCode: string): Promise<JoinResult>` in `src/lib/actions/gangs.ts`
- [ ] `JoinResult` type:
  ```
  | { success: true, status: 'approved' | 'pending', gangId: string }
  | { success: false, error: 'invalid_code' | 'already_member' | 'gang_full' | 'blocked' | 'gang_deleted' | 'not_authenticated' | 'max_gangs' | 'name_collision' | 'server_error', message: string }
  ```
- [ ] Requires authenticated user
- [ ] Steps:
  1. Normalize invite code (uppercase, trim)
  2. Look up gang via `get_gang_by_invite_code(code)` helper (bypasses RLS)
  3. If gang not found or `is_deleted = true` → return `invalid_code` or `gang_deleted`
  4. Check existing `v2_gang_members` row for (gang_id, user_id):
     - If status = `approved` → return `already_member` with gangId (UI should redirect)
     - If `is_blocked = true` → return `blocked`
     - If status = `pending` → return `success, status: 'pending'` (idempotent)
     - If status IN (`rejected`, `left`, `removed`) → update existing row to `pending` + clear `departed_at` + set `requested_at = now()` (rejoin path)
     - If no row exists → insert new row with status `pending`
  5. Enforce display name uniqueness within gang: if user's display_name collides with an existing approved member, return `name_collision`
  6. If gang has `auto_accept = true`:
     - Update the row to `status = 'approved'`, `approved_at = now()` (max-members trigger may fire and raise exception)
     - Create `new_member` notification for the gang admin
  7. Else:
     - Create `join_request` notification for the gang admin
- [ ] Error mapping from trigger exceptions:
  - `MAX_MEMBERS_REACHED` → return `gang_full`
  - `MAX_GANGS_REACHED` → return `max_gangs`
- [ ] Fires PostHog event `GANG_JOIN_REQUESTED` with `{ gang_id, auto_accept, was_rejoin }`
- [ ] On auto-accept success, fires `GANG_MEMBER_APPROVED` as well
- [ ] `revalidatePath('/dashboard')` on success

**Out of scope:**
- Join page UI (GANG-UI-011)
- Notification delivery (handled by INSERT into `v2_notifications`)

**Dependencies:** FND-DB-002 (helper functions), FND-DB-004 (triggers), GANG-DB-002
**Blocks:** GANG-UI-011

**PRD references:**
- [Gangs § Invitations & Joining](../PRD.V2.md#gangs)
- [Join Page](../PRD.V2.md#join-page-joincode)
- [Display name uniqueness](../PRD.V2.md#gangs)
- [Max members trigger](../PRD.V2.md#v2_gang_members--gang-membership)

**Technical notes:**
- Rejoin uses UPDATE, not INSERT (per PRD I8)
- Name collision check: `SELECT 1 FROM v2_gang_members gm JOIN v2_profiles p ON gm.user_id = p.id WHERE gm.gang_id = ? AND gm.status = 'approved' AND p.display_name = ?` — must match case-sensitively
- Notification INSERT uses service role client (since RLS blocks user-initiated inserts)
- Use a `try/catch` to map SQLSTATE-based trigger errors

**Analytics events:**
- `GANG_JOIN_REQUESTED` — `{ gang_id, auto_accept: boolean, was_rejoin: boolean }`
- `GANG_MEMBER_APPROVED` — fired on auto-accept path only

**Unit tests:**
- [ ] Valid code, auto-accept off → pending status
- [ ] Valid code, auto-accept on → approved status, notification created
- [ ] Invalid code → `invalid_code` error
- [ ] Deleted gang → `gang_deleted` error
- [ ] Already approved member → `already_member` error
- [ ] Blocked user → `blocked` error
- [ ] Gang at max members, auto-accept on → `gang_full` error (from trigger)
- [ ] Rejoin after leaving → row UPDATE with clean `departed_at`, status `pending`
- [ ] User at max gangs → `max_gangs` error
- [ ] Display name collision → `name_collision` error

**Test plan:**
- [ ] Test all states from the Join Page (happy path, gang full, blocked, already member, deleted)
- [ ] Test rejoin flow: leave a gang, rejoin, verify status is `pending` again

**Open questions:**
- What if display name collision occurs — should user be asked to change display name, or rejected outright? (For launch: rejected; they can edit name on Profile and retry.)

---

## GANG-API-003: Member management server actions (approve/reject/remove/block/unblock)

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang admin,
> I want to approve pending requests, reject requests, remove members, block members, and unblock members,
> So that I can manage who is in my gang.

**Context / Why:**
All five actions are admin-only and affect `v2_gang_members` rows. Grouping them in one story since they share validation logic and server action patterns.

**Acceptance criteria:**
- [ ] File: `src/lib/actions/gang-members.ts`
- [ ] Five server actions:
  - `approveMember(gangId, userId)` — sets status to `approved`, `approved_at = now()`
  - `rejectMember(gangId, userId)` — sets status to `rejected`
  - `removeMember(gangId, userId)` — sets status to `removed`, `departed_at = now()`
  - `blockMember(gangId, userId)` — sets `is_blocked = true` (status unchanged unless also removing)
  - `unblockMember(gangId, userId)` — sets `is_blocked = false`
- [ ] Each action:
  - Requires authenticated user
  - Verifies caller is admin of the gang via `is_gang_admin(gangId, auth.uid())`
  - Prevents admin from operating on their own row (admins can't remove/block themselves)
  - Updates `v2_gang_members` row via UPDATE (RLS policy allows admin)
  - Fires corresponding PostHog event
  - `revalidatePath('/group/{gangId}')` and `/group/{gangId}/settings`
- [ ] `approveMember` creates a `join_approved` notification for the recipient
- [ ] `rejectMember` creates a `join_rejected` notification for the recipient
- [ ] `removeMember` (for already-approved member) uses type-to-confirm in UI (AUTH-UI-006)
- [ ] Trigger errors mapped to user-friendly messages:
  - `MAX_MEMBERS_REACHED` on approve → "Gang is full (20 members max)"

**Out of scope:** UI components (GANG-UI-008, GANG-UI-013)

**Dependencies:** FND-DB-002 (RLS helpers), FND-DB-004 (triggers)
**Blocks:** GANG-UI-008, GANG-UI-013

**PRD references:**
- [Gangs § Member Management](../PRD.V2.md#gangs)
- [v2_gang_members RLS](../PRD.V2.md#v2_gang_members)

**Technical notes:**
- Use a shared `requireGangAdmin(gangId)` helper at the top of each action
- Notifications use service role client
- Self-action check: `if (targetUserId === auth.uid()) throw new Error('Cannot operate on self')`

**Analytics events:**
- `GANG_MEMBER_APPROVED` — `{ gang_id, target_user_id }`
- `GANG_MEMBER_REJECTED`
- `GANG_MEMBER_REMOVED`
- `GANG_MEMBER_BLOCKED`
- `GANG_MEMBER_UNBLOCKED`

**Unit tests:**
- [ ] Admin can approve pending member
- [ ] Non-admin cannot approve (RLS blocks)
- [ ] Admin cannot remove self
- [ ] Approve at max members → error
- [ ] Reject creates notification for target
- [ ] Block does not change status
- [ ] Unblock clears is_blocked flag

**Test plan:**
- [ ] Create test gang with admin and pending members
- [ ] Run each action, verify DB row changes and notifications created

**Open questions:** None

---

## GANG-API-004: leaveGang server action

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a gang member (non-admin),
> I want to leave a gang,
> So that I no longer participate.

**Context / Why:**
Members can leave voluntarily. Admins cannot leave (must delete the gang instead).

**Acceptance criteria:**
- [ ] Server action `leaveGang(gangId: string)` in `src/lib/actions/gang-members.ts`
- [ ] Requires authenticated user
- [ ] Verifies caller is an approved member (not admin) of the gang
- [ ] If caller is admin → return error "Admins cannot leave — delete the gang instead"
- [ ] Updates the caller's `v2_gang_members` row: `status = 'left'`, `departed_at = now()`
- [ ] Fires `GANG_MEMBER_LEFT` PostHog event
- [ ] `revalidatePath('/dashboard')` and `/group/{gangId}`
- [ ] Redirects to `/dashboard` on success

**Out of scope:** UI button (GANG-UI-010)

**Dependencies:** FND-DB-002, FND-DB-004
**Blocks:** GANG-UI-010

**PRD references:**
- [Gangs § Leaving & Deletion](../PRD.V2.md#gangs)

**Technical notes:**
- RLS allows user to update own row
- Uses the same type-to-confirm dialog on the UI side

**Analytics events:**
- `GANG_MEMBER_LEFT` — `{ gang_id }`, distinct_id: user.id

**Unit tests:**
- [ ] Member leaves successfully
- [ ] Admin cannot leave (error returned)
- [ ] Non-member cannot leave (error)
- [ ] `departed_at` is set, status is `left`

**Test plan:**
- [ ] Join a gang as a member, leave it, verify no longer shown on dashboard
- [ ] Verify standings still show the member (grayed out) in the old gang

**Open questions:** None

---

## GANG-DB-003: delete_gang RPC

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want a Postgres RPC that soft-deletes a gang and notifies all approved members in a single transaction,
> So that the `deleteGang` server action has a clean atomic operation.

**Context / Why:**
Per PRD, gang deletion must: (1) soft-delete the gang row, (2) send notifications to all active members. Must be atomic to prevent partial states.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/009_delete_gang_rpc.sql`
- [ ] Function: `delete_gang(p_gang_id UUID, p_caller_id UUID) RETURNS VOID` marked `SECURITY DEFINER`
- [ ] Implementation (all in one transaction):
  1. Verify caller is admin: `SELECT 1 FROM v2_gang_members WHERE gang_id = p_gang_id AND user_id = p_caller_id AND role = 'admin' AND status = 'approved'` → if not, raise exception with SQLSTATE `42501` and message `NOT_GANG_ADMIN`
  2. Use `SELECT ... FOR UPDATE` on the gang row to prevent concurrent deletions
  3. UPDATE `v2_gangs`: `is_deleted = true`, `deleted_at = now()`
  4. Query all approved members of the gang with `v2_profiles.is_deleted = false`
  5. For each such member, INSERT a `gang_deleted` notification with the gang name in the message; use `ON CONFLICT DO NOTHING` via the unique partial index
  6. Any failure → automatic rollback
- [ ] Returns void on success; caller queries outside if needed
- [ ] Raises exception if gang not found or caller is not admin

**Out of scope:**
- Server action wrapper (GANG-API-005)
- UI delete button (in GANG-UI-012)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-003 (dedup index), FND-DB-004
**Blocks:** GANG-API-005

**PRD references:**
- [Gangs § Leaving & Deletion](../PRD.V2.md#gangs)
- [v2_gangs](../PRD.V2.md#v2_gangs--user-created-groups)
- [v2_notifications § type enum includes gang_deleted](../PRD.V2.md#v2_notifications--user-notifications)

**Technical notes:**
- `FOR UPDATE` lock serializes concurrent deletion attempts
- Message template: e.g., `'The gang {gang_name} has been deleted by the admin.'`
- `gang_deleted` is in the notification type enum

**Analytics events:** None (DB function; event fires from server action)

**Unit tests:**
- [ ] Admin can delete: gang marked deleted, notifications created
- [ ] Non-admin raises exception, no changes
- [ ] Gang not found raises exception
- [ ] Notifications only for non-deleted profiles
- [ ] Re-running is idempotent (dedup index prevents duplicate notifications)

**Test plan:**
- [ ] Create gang with 3 members, run RPC as admin, verify gang deleted and 2 notifications sent
- [ ] Run again, verify no additional notifications

**Open questions:** None

---

## GANG-API-005: deleteGang server action

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a gang admin,
> I want to delete my gang,
> So that it's removed from the platform and members are notified.

**Context / Why:**
Thin wrapper around the `delete_gang` RPC (GANG-DB-003). Handles auth, error mapping, analytics, and redirect.

**Acceptance criteria:**
- [ ] Server action `deleteGang(gangId: string)` in `src/lib/actions/gangs.ts`
- [ ] Requires authenticated user
- [ ] Calls the `delete_gang(gang_id, auth.uid())` RPC from GANG-DB-003
- [ ] Error mapping:
  - `NOT_GANG_ADMIN` → "Only the admin can delete this gang"
  - Other errors → generic fallback
- [ ] Fires `GANG_DELETED` PostHog event on success
- [ ] `revalidatePath('/dashboard')` on success
- [ ] Redirects to `/dashboard` on success

**Out of scope:**
- The RPC itself (GANG-DB-003)
- Delete button UI (GANG-UI-012)

**Dependencies:** GANG-DB-003, FND-004, FND-005
**Blocks:** GANG-UI-012

**PRD references:**
- [Gangs § Leaving & Deletion](../PRD.V2.md#gangs)

**Technical notes:**
- Uses `createClient()` server helper to get auth.uid(); RPC handles the rest in one transaction

**Analytics events:**
- `GANG_DELETED` — `{ gang_id, member_count }`, distinct_id: user.id (count from a query before the RPC or returned from RPC)

**Unit tests:**
- [ ] Admin calls action → RPC invoked, event fired, redirects
- [ ] Non-admin → error "Only the admin can delete this gang"
- [ ] RPC failure → returned as user-friendly error

**Test plan:**
- [ ] As admin, delete a test gang, verify redirect + gang vanished from dashboard + members notified

**Open questions:** None

---

## GANG-API-006: updateGangSettings server action

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a gang admin,
> I want to edit my gang's name, auto-accept toggle, and custom prediction deadline,
> So that I can tune the gang to my group's preferences.

**Context / Why:**
Gang Settings page has three editable fields per PRD.

**Acceptance criteria:**
- [ ] Server action `updateGangSettings(gangId: string, updates: { name?: string, autoAccept?: boolean, predictionDeadlineMins?: number })` in `src/lib/actions/gangs.ts`
- [ ] Requires authenticated admin
- [ ] Validates:
  - `name`: 3–50 chars if provided
  - `predictionDeadlineMins`: integer ≥ 1 and ≤ 1440 (24 hours) if provided
- [ ] Updates:
  - `v2_gangs` SET `name`, `auto_accept` (if provided)
  - `v2_gang_league_seasons` SET `prediction_deadline_mins` WHERE `gang_id = ? AND season_id = active_season` (if provided)
- [ ] Both updates in a single transaction (or two discrete server action calls — depends on implementation)
- [ ] Fires `GANG_SETTINGS_UPDATED` PostHog event with changed fields
- [ ] `revalidatePath('/group/{gangId}')` and `/group/{gangId}/settings`
- [ ] Returns success / error

**Out of scope:**
- Member management edits (GANG-API-003)
- Delete gang (GANG-API-005)

**Dependencies:** FND-DB-001, FND-DB-002
**Blocks:** GANG-UI-012

**PRD references:**
- [Gang Settings Page](../PRD.V2.md#gang-settings-page-groupgroupidsettings)
- [v2_gang_league_seasons](../PRD.V2.md#v2_gang_league_seasons--gang-enrolled-in-a-league-season-with-settings)

**Technical notes:**
- RLS on `v2_gangs` UPDATE and `v2_gang_league_seasons` UPDATE both require admin
- Active season: query `v2_seasons WHERE is_active = true LIMIT 1`

**Analytics events:**
- `GANG_SETTINGS_UPDATED` — `{ gang_id, changed_fields: string[] }`

**Unit tests:**
- [ ] Admin updates name → row updated
- [ ] Admin updates auto-accept → row updated
- [ ] Admin updates deadline → gang_league_seasons updated
- [ ] Non-admin → RLS blocks (error)
- [ ] Invalid name length → rejected
- [ ] Invalid deadline (negative, > 1440) → rejected

**Test plan:**
- [ ] Edit all three fields on settings page, verify DB changes and UI updates

**Open questions:** None

---

## GANG-UI-001: Dashboard page

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want to see my gangs on a dashboard,
> So that I can navigate to any gang or create/join a new one.

**Context / Why:**
Primary landing page after auth. Empty state for new users, grid of gang cards for returning users.

**Acceptance criteria:**
- [ ] Page: `src/app/dashboard/page.tsx` (server component)
- [ ] Includes Global Nav Bar and Global Footer
- [ ] Fetches user's active gangs (approved status) via DAL `getUserGangs(userId)`:
  - JOIN `v2_gang_members` with `v2_gangs` (filter `is_deleted = false`)
  - Returns gang name, member count, user's role
- [ ] Also fetches user's pending join requests (if any) to show status
- [ ] Shows pending invite banner (GANG-UI-004) at top if applicable
- [ ] If 0 gangs → empty state with create/join forms centered
- [ ] If ≥1 gangs → grid of gang cards (GANG-UI-006) + create/join forms at bottom
- [ ] Page metadata: `<title>Dashboard | Bragg</title>`

**Out of scope:**
- Create gang form (GANG-UI-002)
- Join gang form (GANG-UI-003)
- Gang card (GANG-UI-006)
- Pending invite banner (GANG-UI-004)

**Dependencies:** AUTH-MW-001, FND-DB-001, GANG-UI-002, GANG-UI-003, GANG-UI-004, GANG-UI-006
**Blocks:** None (this is the landing page for auth'd users)

**PRD references:**
- [Dashboard](../PRD.V2.md#dashboard-dashboard)

**Technical notes:**
- Use React Server Component for data fetching
- DAL file: `src/lib/dal/gangs.ts`
- Query pattern: `SELECT g.*, COUNT(gm.*) as member_count FROM v2_gangs g JOIN v2_gang_members gm ... GROUP BY g.id` — single query, no N+1
- Handle edge case: user is admin of 0 gangs but member of some → show them

**Analytics events:**
- Autocapture handles pageview

**Unit tests:**
- [ ] DAL function returns expected shape
- [ ] Page renders empty state when no gangs
- [ ] Page renders gang list when gangs exist

**Test plan:**
- [ ] Sign in as new user → see empty state
- [ ] Create a gang → see it appear on dashboard
- [ ] Sign in as user in multiple gangs → see all listed

**Open questions:** None

---

## GANG-UI-002: Create Gang form component

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want a simple form to create a gang with just a name,
> So that I can start a new group quickly.

**Context / Why:**
Inline form on the Dashboard (and possibly elsewhere). Single input, submit button.

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/create-gang-form.tsx` (client component)
- [ ] Single text input for gang name (3–50 chars, autofocus optional)
- [ ] Submit button ("Create Gang")
- [ ] Calls `createGang` server action
- [ ] Loading state during submit (button disabled, spinner)
- [ ] Inline error message on failure
- [ ] On success → redirect to `/group/{gangId}` (use `router.push` + `startTransition`)
- [ ] Client-side validation: trim name, 3–50 chars
- [ ] Accessible labels

**Out of scope:** Server action (GANG-API-001)

**Dependencies:** GANG-API-001, FND-006
**Blocks:** GANG-UI-001

**PRD references:**
- [Dashboard § Empty State / Gangs List](../PRD.V2.md#dashboard-dashboard)

**Technical notes:**
- Use shadcn `Input`, `Button`
- `useTransition` for loading state
- `useRouter` for navigation

**Analytics events:**
- `GANG_CREATED` fires from server action

**Unit tests:**
- [ ] Renders with input and button
- [ ] Submit calls server action
- [ ] Error state displays inline

**Test plan:**
- [ ] Create gang with valid name → redirects to gang page
- [ ] Create with empty name → shows error

**Open questions:** None

---

## GANG-UI-003: Join Gang form component

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want to enter an invite code to join a gang,
> So that I can join a friend's gang without clicking a link.

**Context / Why:**
Inline form on the Dashboard (alongside create gang).

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/join-gang-form.tsx`
- [ ] Single text input for invite code (normalize to uppercase on input)
- [ ] Submit button ("Join")
- [ ] Calls `joinGang` server action
- [ ] Loading state during submit
- [ ] Handles result states:
  - Success (approved via auto-accept) → redirect to gang page
  - Success (pending) → show "Request sent, waiting for admin" message
  - Invalid code → inline error
  - Already member → redirect to gang page with toast
  - Gang full / blocked / deleted → inline error with matching copy
  - Max gangs reached → inline error
  - Name collision → inline error with hint to change display name on Profile
- [ ] Auto-uppercase input as user types (invite codes are always uppercase)
- [ ] Accessible labels

**Out of scope:** Server action (GANG-API-002)

**Dependencies:** GANG-API-002, FND-006
**Blocks:** GANG-UI-001

**PRD references:**
- [Dashboard](../PRD.V2.md#dashboard-dashboard)
- [Join Page § Authenticated user](../PRD.V2.md#join-page-joincode)

**Technical notes:**
- Input value always rendered in uppercase (`value.toUpperCase()`)
- Max length 6 chars
- Use shadcn `Input`, `Button`

**Analytics events:**
- `GANG_JOIN_REQUESTED` fires from server action

**Unit tests:**
- [ ] Renders with input and button
- [ ] Input is auto-uppercased
- [ ] Handles each error state correctly
- [ ] Success state redirects or shows pending message

**Test plan:**
- [ ] Join with valid code (auto-accept on) → immediate redirect
- [ ] Join with valid code (auto-accept off) → pending message
- [ ] Try each error case: invalid code, full gang, blocked, etc.

**Open questions:** None

---

## GANG-UI-004: Pending Invite Banner

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a user who clicked an invite link while logged out,
> I want to see a banner on my dashboard after signing in that offers to join the gang I was invited to,
> So that I complete my join action seamlessly.

**Context / Why:**
When an unauthenticated user visits `/join/[code]`, the invite code + gang name are stored in localStorage. After sign-in, the dashboard reads the cached data and shows a banner.

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/pending-invite-banner.tsx` (client component)
- [ ] Reads localStorage for key `bragg_pending_invite` on mount
- [ ] localStorage entry format: `{ code: string, gangName: string, storedAt: number (ms) }`
- [ ] Auto-expires after 24 hours (check `Date.now() - storedAt > 24 * 60 * 60 * 1000`)
- [ ] Displays:
  - "You were invited to join **{gangName}**"
  - "Join Gang" button (primary)
  - "Dismiss" button (secondary)
- [ ] Clicking "Join Gang" → calls `joinGang(code)` server action
- [ ] Success → clears localStorage, redirects to gang page or shows pending state
- [ ] Clicking "Dismiss" → clears localStorage, hides banner
- [ ] Fires `GANG_INVITE_BANNER_SHOWN` (pageview proxy) and `GANG_INVITE_BANNER_CLICKED` on action

**Out of scope:** The localStorage writer on `/join/[code]` (covered by GANG-UI-011)

**Dependencies:** GANG-API-002, FND-006
**Blocks:** GANG-UI-001

**PRD references:**
- [Dashboard § Pending Invite Banner](../PRD.V2.md#dashboard-dashboard)
- [Gangs § Unauthenticated invite flow](../PRD.V2.md#gangs)

**Technical notes:**
- `useEffect` to read localStorage on mount
- Clear stale entries immediately on mount if expired
- Banner renders null if no valid invite cached

**Analytics events:**
- `GANG_INVITE_BANNER_CLICKED` — `{ action: 'join' | 'dismiss' }`

**Unit tests:**
- [ ] Renders nothing if localStorage empty
- [ ] Renders banner if valid entry exists
- [ ] Dismisses on clicking dismiss
- [ ] Calls joinGang on clicking join
- [ ] Hides after 24 hours

**Test plan:**
- [ ] Manually set localStorage entry, reload dashboard, verify banner
- [ ] Click join, verify flow
- [ ] Click dismiss, verify localStorage cleared

**Open questions:** None

---

## GANG-UI-005: Gang Page shell (header, member list section, placeholders)

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see my gang's name, member count, invite actions, and a member list,
> So that I know who's in the gang and can invite more friends.

**Context / Why:**
The gang page has many sections. This story covers the page shell, gang header, member list, and placeholders for sections built in later phases (matches, standings, leaderboard).

**Acceptance criteria:**
- [ ] Page: `src/app/group/[groupId]/page.tsx` (server component)
- [ ] Layout file: `src/app/group/[groupId]/layout.tsx` — includes Global Nav, Footer
- [ ] Auth + membership check: verify user is an approved member; if not, redirect to dashboard
- [ ] Fetches gang data via DAL `getGangDetails(gangId, userId)`:
  - Gang row (verify not deleted)
  - All members with status IN (`approved`, `left`, `removed`) and their profiles
  - Current user's role
- [ ] Renders sections:
  - Gang header: name, member count (`N/20`)
  - Invite actions (GANG-UI-007)
  - Link to Season Standings (placeholder for now; Phase 6)
  - Link to Gang Settings (visible only if admin)
  - Pending join requests section (GANG-UI-008) — visible only to admin
  - **Upcoming Matches** — placeholder "Coming in Phase 3"
  - **Live Matches** — placeholder
  - **Recent Results** — placeholder
  - Member list (GANG-UI-009)
  - Leave gang button (GANG-UI-010) — visible only if not admin
- [ ] Handles gang not found or deleted → 404 or redirect
- [ ] Page metadata: `<title>{gangName} | Bragg</title>`

**Out of scope:**
- Match sections (Phase 3 + 4 + 5)
- Standings link (Phase 6)
- Settings page (GANG-UI-012)
- Member list component (GANG-UI-009)
- Invite actions (GANG-UI-007)
- Pending requests (GANG-UI-008)
- Leave button (GANG-UI-010)

**Dependencies:** FND-DB-001, AUTH-MW-001, GANG-UI-007, GANG-UI-008, GANG-UI-009, GANG-UI-010
**Blocks:** All remaining gang UI stories build on this shell

**PRD references:**
- [Gang Page](../PRD.V2.md#gang-page-groupgroupid)

**Technical notes:**
- URL path `/group/[groupId]` is intentionally legacy (per PRD note)
- Use React Server Component for data fetching
- DAL: `src/lib/dal/gangs.ts` adds `getGangDetails`
- Query includes JOIN with profiles for display names

**Analytics events:**
- Autocapture handles pageview

**Unit tests:**
- [ ] DAL returns correct shape
- [ ] Page renders for member
- [ ] Non-member redirected
- [ ] Deleted gang → 404

**Test plan:**
- [ ] Visit gang page as admin, see all sections including admin-only
- [ ] Visit as member, verify leave button shown, settings link hidden
- [ ] Visit as non-member → redirected

**Open questions:** None

---

## GANG-UI-006: Gang card component

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a user on the dashboard,
> I want each of my gangs displayed as a visually distinct card,
> So that I can quickly pick which gang to open.

**Context / Why:**
Reusable card for the dashboard gangs list.

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/gang-card.tsx`
- [ ] Props: `gang: { id, name, memberCount, userRole: 'admin' | 'member' }`
- [ ] Renders:
  - Gang name (prominent)
  - Member count (`5 in the squad` or similar Bragg-voice copy)
  - Role badge (Admin / Member)
  - Clickable whole card → navigates to `/group/{gangId}`
- [ ] Hover/focus states
- [ ] Dark mode styling from FND-006
- [ ] Accessible: entire card is a `<Link>` with aria-label

**Out of scope:** Dashboard grid layout (GANG-UI-001)

**Dependencies:** FND-006
**Blocks:** GANG-UI-001

**PRD references:**
- [Dashboard § Gangs List](../PRD.V2.md#dashboard-dashboard)

**Technical notes:**
- Use shadcn `Card` primitive
- Use `lucide-react` icons (Crown for admin, User for member)

**Analytics events:**
- None directly; autocapture handles clicks

**Unit tests:**
- [ ] Renders gang name, member count, role badge
- [ ] Admin role shows distinct icon/color

**Test plan:**
- [ ] Render multiple cards on dashboard, verify visual layout
- [ ] Click card, verify navigation

**Open questions:** None

---

## GANG-UI-007: Invite link / Share component

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a gang member,
> I want to copy the invite link or share it via the native share sheet on mobile,
> So that I can invite friends quickly.

**Context / Why:**
Per PRD, all gang members can invite. Desktop shows "Copy Link", mobile shows "Share" (native share sheet).

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/invite-actions.tsx`
- [ ] Props: `inviteCode: string, gangName: string, inviterName: string`
- [ ] Computes share URL: `{APP_URL}/join/{inviteCode}`
- [ ] Computes share message: `"{inviterName} is calling you up to {gangName} on Bragg — the IPL prediction game built for bragging rights.\n\nGang Code: {inviteCode}\n{url}"`
- [ ] Detects mobile via `navigator.userAgent` check
- [ ] On desktop:
  - "Copy Link" button → copies URL via `navigator.clipboard.writeText`
  - "Copy Message" button → copies full message
  - Shows "Copied!" feedback for 2s
- [ ] On mobile:
  - "Share" button → calls `navigator.share({ title, text, url })`
  - Falls back to clipboard copy if `navigator.share` unavailable or user cancels
- [ ] Fires PostHog events:
  - `GANG_INVITE_COPIED` on clipboard copy
  - `GANG_INVITE_SHARED` on native share

**Out of scope:** Share URL routing (covered by GANG-UI-011 Join page)

**Dependencies:** FND-005, FND-006
**Blocks:** GANG-UI-005

**PRD references:**
- [Gangs § Invitations & Joining](../PRD.V2.md#gangs)

**Technical notes:**
- `APP_URL` from env vars
- Navigator share API: check `typeof navigator.share === 'function'` before calling
- Handle the AbortError (user cancels share sheet) silently

**Analytics events:**
- `GANG_INVITE_COPIED` — `{ gang_id }`
- `GANG_INVITE_SHARED` — `{ gang_id }`

**Unit tests:**
- [ ] Copies URL to clipboard on desktop
- [ ] Shows "Copied!" feedback
- [ ] Calls navigator.share on mobile (mocked)
- [ ] Falls back to copy if share unavailable

**Test plan:**
- [ ] Desktop: click copy, paste somewhere, verify URL
- [ ] Mobile: click share, verify native share sheet opens

**Open questions:** None

---

## GANG-UI-008: Pending join requests section (admin only)

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a gang admin,
> I want to see pending join requests at the top of my gang page and approve/reject them with one click,
> So that I can quickly add friends as they request to join.

**Context / Why:**
Per PRD, pending requests are shown below the gang header (admin-only).

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/pending-requests-section.tsx`
- [ ] Server component — fetches pending members via DAL
- [ ] Visible only when `userRole === 'admin'` and there are pending requests
- [ ] For each pending request:
  - Shows profile display name and request timestamp ("2 hours ago")
  - "Approve" button (primary)
  - "Reject" button (secondary)
- [ ] Approve button → calls `approveMember(gangId, userId)` server action
- [ ] Reject button → calls `rejectMember(gangId, userId)` server action
- [ ] Loading states per-row
- [ ] Updates optimistically OR re-fetches after action
- [ ] Empty state: hidden if no pending requests
- [ ] Shows count badge in section header: "Pending Requests (3)"

**Out of scope:** Server actions (GANG-API-003)

**Dependencies:** GANG-API-003, FND-006
**Blocks:** GANG-UI-005

**PRD references:**
- [Gang Page § Pending join requests](../PRD.V2.md#gang-page-groupgroupid)

**Technical notes:**
- DAL: `getPendingJoinRequests(gangId)` — returns list with display_name
- Use `useTransition` for action handling
- Call `router.refresh()` after action to re-fetch server data

**Analytics events:**
- `GANG_MEMBER_APPROVED` / `GANG_MEMBER_REJECTED` fire from server actions

**Unit tests:**
- [ ] Renders list of pending requests
- [ ] Approve button calls correct action
- [ ] Reject button calls correct action
- [ ] Hidden when no pending requests or user not admin

**Test plan:**
- [ ] Create a pending member, view as admin, approve them, verify they move to member list
- [ ] Reject another pending member, verify notification sent

**Open questions:** None

---

## GANG-UI-009: Member list / Leaderboard component

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang member,
> I want to see all members of my gang with their role and (eventually) their points,
> So that I know who's in the gang and how I rank.

**Context / Why:**
The member list doubles as a season leaderboard. In Phase 2, we just show members and roles; points come in Phase 6.

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/member-list.tsx`
- [ ] Props: `members: Member[]` where `Member = { userId, displayName, role, status, isCurrentUser, points? }`
- [ ] Renders each member as a row with:
  - Avatar initial
  - Display name (with `(you)` label if current user)
  - Role icon (Crown for admin, nothing for member)
  - Overall points (placeholder "0 pts" for Phase 2 — real data in Phase 6)
- [ ] Left/removed members shown at bottom, grayed out
- [ ] Current user's row highlighted
- [ ] Sorted per PRD: active first, then by points DESC (placeholder in Phase 2), then alphabetical
- [ ] Accessible list semantics

**Out of scope:**
- Live points (Phase 6)
- Linking to user profile (Phase 6)

**Dependencies:** FND-006
**Blocks:** GANG-UI-005

**PRD references:**
- [Gang Page § Member List / Leaderboard](../PRD.V2.md#gang-page-groupgroupid)
- [Gangs § Leaving & Deletion](../PRD.V2.md#gangs)

**Technical notes:**
- Use lucide `Crown` icon for admin
- Grayed-out style: `opacity-50 text-muted`
- In Phase 2, points default to 0; Phase 6 populates from `v2_gang_season_standings`

**Analytics events:** None

**Unit tests:**
- [ ] Renders list of members
- [ ] Current user row highlighted
- [ ] Left/removed members at bottom, grayed
- [ ] Admin has crown icon

**Test plan:**
- [ ] View gang with 2 admins and 3 members → verify sort order
- [ ] Leave gang, verify your row shows grayed

**Open questions:** None

---

## GANG-UI-010: Leave Gang option

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As a gang member (not admin),
> I want a button at the bottom of the gang page to leave the gang,
> So that I can exit a gang I no longer want to be part of.

**Context / Why:**
Per PRD, leave button is at the bottom of the Gang Page. Uses type-to-confirm dialog.

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/leave-gang-button.tsx`
- [ ] Visible only when current user is a non-admin member
- [ ] On click → opens Destructive Action Dialog (AUTH-UI-006) with:
  - Title: "Leave {gangName}?"
  - Description: "You will lose access to this gang. You can rejoin with an invite code unless you're blocked."
  - Confirm value: gang name (case-sensitive)
  - Confirm label: "Leave Gang"
- [ ] On confirm → calls `leaveGang(gangId)` server action
- [ ] On success → redirect to `/dashboard`
- [ ] Error handling: display error inline in dialog

**Out of scope:** Server action (GANG-API-004)

**Dependencies:** GANG-API-004, AUTH-UI-006
**Blocks:** GANG-UI-005

**PRD references:**
- [Gang Page § Leave gang option](../PRD.V2.md#gang-page-groupgroupid)
- [Destructive Action Confirmation](../PRD.V2.md#destructive-action-confirmation)

**Technical notes:**
- Pass gang name to the dialog so confirm value is dynamic

**Analytics events:**
- `GANG_MEMBER_LEFT` fires from server action

**Unit tests:**
- [ ] Button visible only for non-admin
- [ ] Opens dialog on click
- [ ] Confirm calls leaveGang
- [ ] On success, navigates to dashboard

**Test plan:**
- [ ] As member, click leave, type gang name, confirm → verify redirect and DB row update

**Open questions:** None

---

## GANG-UI-011: Join Page (`/join/[code]`)

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As someone with an invite link,
> I want a dedicated page that shows the gang I'm being invited to and lets me sign in (if needed) or join directly,
> So that the invite flow is smooth whether I'm logged in or not.

**Context / Why:**
Public route. Handles both authenticated and unauthenticated visitors. Unauthenticated users have their invite cached in localStorage for post-signin pickup.

**Acceptance criteria:**
- [ ] Page: `src/app/join/[code]/page.tsx` (server component)
- [ ] Fetches gang via `get_gang_by_invite_code(code)` RPC (bypasses RLS)
- [ ] Handles gang not found or deleted → shows 404-like state: "Gang not found or no longer exists"
- [ ] Generates Open Graph metadata (for rich link previews in messaging apps)
- [ ] Two main branches:
  1. **Unauthenticated visitor:**
     - Shows gang name, "You've been invited to {gangName}"
     - Inline login form (magic link, similar to AUTH-UI-001)
     - Before rendering, writes `{ code, gangName, storedAt }` to localStorage (`bragg_pending_invite` key) via a client sub-component
  2. **Authenticated visitor:**
     - Checks existing membership via RLS-scoped query
     - If already approved → redirects to gang page
     - If pending → shows "Request already pending — waiting for admin approval"
     - If no membership → shows gang name + "Join Gang" button
     - Join button calls `joinGang` server action
     - Handles each result state per PRD Join Page section (auto-accept on, off, rejected, blocked, full, deleted)
- [ ] Includes Global Footer (not standalone per PRD — footer shows on join page)

**Out of scope:** joinGang server action (GANG-API-002), login form (reuse AUTH-UI-001 logic)

**Dependencies:** AUTH-API-001, GANG-API-002, AUTH-UI-001, FND-006
**Blocks:** None

**PRD references:**
- [Join Page](../PRD.V2.md#join-page-joincode)
- [Gangs § Invitations & Joining](../PRD.V2.md#gangs)

**Technical notes:**
- `get_gang_by_invite_code` is a SECURITY DEFINER function (bypasses RLS)
- localStorage writer is a client component wrapped in suspense
- OG meta: use Next.js metadata API with `generateMetadata`
- If `navigator` is unavailable (SSR), skip the localStorage write — it's a client-only effect

**Analytics events:**
- `GANG_INVITE_LINK_OPENED` (custom, optional)
- `GANG_JOIN_REQUESTED` fires from server action

**Unit tests:**
- [ ] Valid code, unauth → login form + localStorage write
- [ ] Valid code, auth, not member → join button
- [ ] Valid code, auth, already member → redirect
- [ ] Invalid code → not found state
- [ ] Deleted gang → not found state

**Test plan:**
- [ ] Visit `/join/ABC123` while logged out → see login form
- [ ] Sign in → land on dashboard → see pending invite banner
- [ ] Visit `/join/ABC123` while logged in → join button appears
- [ ] Click join → appropriate state per auto-accept setting

**Open questions:**
- Should OG previews include gang creator's name? (Privacy concern — may leak user info to anyone with a shared link. Recommendation: just gang name.)

---

## GANG-UI-012: Gang Settings page

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a gang admin,
> I want a settings page where I can edit gang name, toggle auto-accept, set prediction deadline, manage members, and delete the gang,
> So that I can fully administer my gang.

**Context / Why:**
Admin-only page. Centralizes all admin actions.

**Acceptance criteria:**
- [ ] Page: `src/app/group/[groupId]/settings/page.tsx` (server component)
- [ ] Admin check: if not admin, redirect to `/group/[groupId]` (page-level check per PRD)
- [ ] Fetches gang data including current settings and member list
- [ ] Sections:
  1. **Gang name editor** — input + save button, calls `updateGangSettings`
  2. **Auto-accept toggle** — switch, calls `updateGangSettings` on change
  3. **Prediction deadline** — number input in minutes (default 45), calls `updateGangSettings`
  4. **Member management** (GANG-UI-013) — list with remove/block/unblock actions
  5. **Delete gang** — danger zone with Destructive Action Dialog; uses `deleteGang` server action; confirm by typing gang name
- [ ] Includes Global Nav Bar and Global Footer
- [ ] Mobile-responsive

**Out of scope:**
- Server actions (GANG-API-003, GANG-API-005, GANG-API-006)
- Member management list (GANG-UI-013)
- Destructive dialog (AUTH-UI-006)

**Dependencies:** GANG-API-003, GANG-API-005, GANG-API-006, AUTH-UI-006, GANG-UI-013
**Blocks:** None

**PRD references:**
- [Gang Settings Page](../PRD.V2.md#gang-settings-page-groupgroupidsettings)

**Technical notes:**
- Use shadcn `Switch`, `Input`, `Button`, `Separator`
- Organize as vertical sections with headings
- "Danger Zone" styled with red accent for delete gang

**Analytics events:**
- Fired from server actions

**Unit tests:**
- [ ] Admin can access the page
- [ ] Non-admin is redirected
- [ ] Name edit calls update action
- [ ] Toggle calls update action
- [ ] Delete opens dialog

**Test plan:**
- [ ] Edit name, save, verify header updates
- [ ] Toggle auto-accept, create a test join request, verify auto-approved
- [ ] Change deadline, verify next match deadline reflects
- [ ] Delete gang with confirmation, verify redirect and notifications

**Open questions:** None

---

## GANG-UI-013: Member management list (in Gang Settings)

**Phase:** Phase 2 — Gangs
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As a gang admin on the settings page,
> I want a list of all members (including blocked and removed) with actions to remove, block, or unblock,
> So that I can fully control gang membership.

**Context / Why:**
Different from the gang page's member list — this one shows ALL statuses (including blocked/removed) and has action buttons per row.

**Acceptance criteria:**
- [ ] Component: `src/components/gangs/member-management-list.tsx`
- [ ] Server component — fetches ALL members (pending, approved, rejected, removed, left, and blocked flag)
- [ ] Each row shows:
  - Display name
  - Status badge (Pending / Approved / Rejected / Removed / Left / Blocked)
  - Actions based on status:
    - Pending → Approve, Reject
    - Approved → Remove, Block
    - Rejected → (no actions — they can request again)
    - Removed/Left → Block (if not already blocked), Unblock (if blocked)
    - Blocked (any status) → Unblock
- [ ] Admin cannot perform actions on their own row
- [ ] Remove button opens Destructive Action Dialog (confirm with display name)
- [ ] Block/Unblock are single-click (no confirmation for Block; confirmation for Unblock? — per PRD no, they're both simple)
- [ ] Calls `approveMember`, `rejectMember`, `removeMember`, `blockMember`, `unblockMember` server actions
- [ ] Optimistic update or `router.refresh()` after each action

**Out of scope:** Server actions (GANG-API-003)

**Dependencies:** GANG-API-003, AUTH-UI-006, FND-006
**Blocks:** GANG-UI-012

**PRD references:**
- [Gang Settings Page § Member management](../PRD.V2.md#gang-settings-page-groupgroupidsettings)
- [Gangs § Member Management](../PRD.V2.md#gangs)

**Technical notes:**
- DAL: `getAllGangMembers(gangId)` — returns all rows regardless of status
- RLS allows admin to SELECT all members per PRD

**Analytics events:**
- Fired from server actions

**Unit tests:**
- [ ] Renders all members with correct status
- [ ] Shows action buttons per status
- [ ] Admin's own row has no actions
- [ ] Remove opens confirm dialog
- [ ] Block is single-click

**Test plan:**
- [ ] Test each action on a test gang with various member states
- [ ] Verify admin can't remove self
- [ ] Verify blocked user can't rejoin

**Open questions:**
- Should block be confirmable with a dialog? (PRD doesn't require it; simple button is fine.)

---

## Summary

Phase 2 delivers the full gangs experience. After this phase, the app supports the entire gang lifecycle: create, invite, join, manage members, update settings, leave, delete.

**Story count:** 20 stories (1 DB RPC, 6 server actions, 13 UI)
**Estimated total effort:** ~20–30 working days

**Ship readiness:**
- ✅ Dashboard with gangs list
- ✅ Create gang end-to-end
- ✅ Join gang via code or link
- ✅ Gang page with members
- ✅ Admin controls (approve/reject/remove/block/unblock/settings/delete)
- ✅ Leave gang flow
- ⏳ Match sections on gang page are placeholders — filled in Phase 3
