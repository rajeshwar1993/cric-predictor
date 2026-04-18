# ADM-016: Scenario Template Management

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-003
**Estimated scope:** CRUD for scenario templates with validation, bulk toggle, and points budget enforcement

---

## Description

Upgrade the read-only scenario templates tab in `/admin/reference` to a full management interface. Currently, modifying templates requires direct SQL access. This story adds the ability to create, edit, toggle (activate/deactivate), and delete scenario templates from the admin panel, with guardrails to prevent breaking the seeding pipeline or corrupting live data.

### Why

- Templates are the source of truth for what scenarios get seeded per fixture. Changing a template's title, points, options, or active status is a common operational need (e.g., adjusting point values between seasons, adding new scenario types, deactivating a scenario that's hard to resolve).
- Today this requires running SQL against production, which is error-prone and has no validation.
- The admin should be able to iterate on the scenario set without developer involvement.

---

## Acceptance Criteria

### Template List (upgrade existing `scenario-templates-table.tsx`)
- [ ] Each row gets an **Edit** button (pencil icon) and a **Toggle Active** switch
- [ ] **Add Template** button at the top of the tab
- [ ] Active points budget displayed prominently; updates live as templates are toggled/edited
- [ ] Points budget warning (red) if total active points != 210
- [ ] Inactive templates shown with reduced opacity (existing behavior) but still editable

### Create Template
- [ ] Modal/drawer form with fields:
  - `slug` — text input, required, lowercase + underscores only, must be unique
  - `title` — text input, required, supports `{Home Team}` / `{Away Team}` placeholders
  - `sport_id` — select dropdown (populated from `v2_sports`), required
  - `input_type` — select from enum: `team_pick`, `player_pick`, `range`, `yes_no`
  - `options` — JSON editor (textarea), required when `input_type = range`, null otherwise
  - `points` — number input, required, min 1
  - `resolution_phase` — select from enum: `toss`, `first_wicket`, `team_powerplay_end`, `mid_match`, `team_innings_end`, `end`, `post_match`
  - `is_active` — toggle, default true
- [ ] Validation:
  - Slug format: `/^[a-z][a-z0-9_]*$/`
  - Slug uniqueness checked before submit (client-side against loaded templates + server-side via DB constraint)
  - Options must be valid JSON when provided
  - Options required when `input_type = range`, hidden/disabled otherwise
  - Points must be a positive integer
- [ ] On success: table refreshes via `revalidatePath`, success toast
- [ ] On error: inline error message, form stays open

### Edit Template
- [ ] Same form as Create, pre-populated with existing values
- [ ] `slug` field is **read-only** after creation (changing slug would break the unique constraint on `v2_fixture_scenarios` and orphan seeded scenarios)
- [ ] All other fields are editable
- [ ] Show warning if template has already been seeded to fixtures: "This template has been seeded to X fixtures. Changes to title, points, or options will only affect future fixtures — already-seeded scenarios are not retroactively updated."
- [ ] On success: table refreshes, success toast

### Toggle Active/Inactive
- [ ] Inline toggle switch on each row
- [ ] Toggling to inactive: confirm dialog — "Deactivating this template means it won't be seeded for future fixtures. X existing seeded scenarios will not be affected. Continue?"
- [ ] Toggling to active: no confirmation needed
- [ ] Updates `is_active` in `v2_scenario_templates`
- [ ] Points budget recalculates immediately

### Delete Template
- [ ] Delete button (trash icon) on each row, visible only for templates with **zero** seeded `v2_fixture_scenarios`
- [ ] Templates that have been seeded cannot be deleted (FK constraint via `ON DELETE RESTRICT` on `v2_fixture_scenarios.template_id`). Hide the delete button and show a tooltip: "Cannot delete — this template has been seeded to fixtures. Deactivate it instead."
- [ ] Confirm dialog before delete: "Permanently delete template '{slug}'? This cannot be undone."
- [ ] On success: row removed, toast

---

## Files to Create / Modify

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── reference/
│               └── page.tsx                          # MODIFY — pass seeded counts to templates tab
├── components/
│   └── admin/
│       └── reference/
│           ├── scenario-templates-table.tsx           # MODIFY — add edit/toggle/delete/create actions
│           ├── scenario-template-form.tsx             # CREATE — modal form for create/edit
│           ├── scenario-template-form.stories.tsx     # CREATE
│           └── scenario-templates-table.stories.tsx   # MODIFY — add stories for new states
├── lib/
│   ├── actions/
│   │   └── admin/
│   │       └── scenario-templates.ts                  # CREATE — server actions for CRUD
│   └── dal/
│       └── admin/
│           └── reference.ts                           # MODIFY — add mutation queries + seeded count query
```

---

## Technical Notes

### Server Actions (`lib/actions/admin/scenario-templates.ts`)

```typescript
'use server'

// All actions require isSystemAdmin() check

export async function createScenarioTemplate(data: CreateTemplateInput): Promise<ActionResult>
// Validates input, inserts into v2_scenario_templates, revalidates /admin/reference

export async function updateScenarioTemplate(id: string, data: UpdateTemplateInput): Promise<ActionResult>
// Validates input, updates v2_scenario_templates, revalidates /admin/reference
// slug is NOT updatable

export async function toggleScenarioTemplateActive(id: string, isActive: boolean): Promise<ActionResult>
// Updates is_active on v2_scenario_templates, revalidates /admin/reference

export async function deleteScenarioTemplate(id: string): Promise<ActionResult>
// Checks seeded count first (reject if > 0), deletes from v2_scenario_templates
// DB constraint (ON DELETE RESTRICT) is the safety net
```

### DAL Additions (`lib/dal/admin/reference.ts`)

```typescript
// Count of seeded v2_fixture_scenarios per template_id
export async function getScenarioTemplateSeededCounts(): Promise<Record<string, number>>
// Returns { [template_id]: count_of_fixture_scenarios }
// Used to determine if a template can be deleted and to show the "seeded to X fixtures" warning
```

### Key Design Decisions

- **Slug is immutable after creation.** The seeding function uses `ON CONFLICT (gang_id, fixture_id, slug) DO NOTHING` — changing a slug would cause duplicate seeding. The `v2_fixture_scenarios` table also stores the slug directly (denormalized), so changing the template slug would create a mismatch.
- **Edits are forward-only.** Changing a template's title/points/options does NOT retroactively update already-seeded `v2_fixture_scenarios`. This is by design — in-progress or completed fixtures should not have their scenarios mutated. The UI makes this clear with a warning.
- **Delete is restricted to unseeded templates.** This is enforced at both the UI level (hide button) and DB level (`ON DELETE RESTRICT`). For templates that have been used, deactivation is the correct action.
- **Points budget is advisory, not enforced.** The UI shows a warning when active points != 210, but does not block saves. This allows the admin to temporarily have a mismatched budget while adjusting multiple templates.

---

## Edge Cases

- Creating a template with a slug that already exists → server action returns validation error, form shows inline error
- Editing a template while the seed-scenarios cron is running → no conflict; the cron uses `ON CONFLICT DO NOTHING` on the fixture_scenarios table
- Deleting a template that gets seeded between the UI check and the delete → DB constraint catches it, action returns error, UI shows toast
- Toggling a template inactive while fixtures are within the 14-hour seeding window → already-seeded fixtures keep their scenarios; un-seeded fixtures in the window won't get this scenario on next cron run
- JSON options with invalid syntax → client-side JSON.parse validation before submit
- Points value of 0 → blocked by validation (min 1)

---

## Storybook Requirements

### ScenarioTemplateForm Stories
- `CreateEmpty` — blank form for new template
- `CreateWithRangeType` — input_type set to range, options field visible
- `EditExisting` — pre-populated with an existing template
- `EditWithSlugDisabled` — slug field shown as read-only
- `EditWithSeededWarning` — warning banner shown for seeded template
- `ValidationErrors` — form with validation errors displayed

### ScenarioTemplatesTable Stories (additions)
- `WithActions` — table with edit/toggle/delete buttons
- `DeleteDisabledForSeeded` — delete button hidden, tooltip shown
- `PointsBudgetOk` — budget = 210, green indicator
- `PointsBudgetMismatch` — budget != 210, red warning

---

## Testing Requirements

- [ ] Unit test: `createScenarioTemplate` — validates slug format, rejects duplicates
- [ ] Unit test: `createScenarioTemplate` — requires options when input_type is range
- [ ] Unit test: `updateScenarioTemplate` — does not allow slug changes
- [ ] Unit test: `updateScenarioTemplate` — succeeds for valid updates
- [ ] Unit test: `toggleScenarioTemplateActive` — toggles is_active flag
- [ ] Unit test: `deleteScenarioTemplate` — rejects deletion when seeded count > 0
- [ ] Unit test: `deleteScenarioTemplate` — succeeds when seeded count = 0
- [ ] Unit test: `getScenarioTemplateSeededCounts` — returns correct counts per template
- [ ] Unit test: ScenarioTemplateForm validates slug format (lowercase + underscores)
- [ ] Unit test: ScenarioTemplateForm validates JSON options syntax
- [ ] Unit test: ScenarioTemplateForm shows/hides options field based on input_type
- [ ] Unit test: ScenarioTemplatesTable calculates points budget correctly after toggle
