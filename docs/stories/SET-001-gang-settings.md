# SET-001: Gang Settings Page

**Phase:** 11 — Gang Settings
**Dependencies:** GANG-001, DSN-003
**Estimated scope:** Admin-only settings page with gang name edit, auto-accept toggle, deadline config, delete gang

---

## Description

Build the gang settings page (`/group/[groupId]/settings`), accessible only to gang admins. Allows editing gang name, toggling auto-accept, configuring prediction deadline, and deleting the gang.

---

## Acceptance Criteria

### Gang Settings Page
- [ ] Route: `/group/[groupId]/settings`
- [ ] **Admin-only:** non-admin access redirects to gang page
- [ ] Page title: "GANG SETTINGS"
- [ ] Sections: Gang Info, Prediction Settings, Member Management (SET-002), Danger Zone

### Gang Info Section
- [ ] Gang name: editable input (3–50 chars), save button
- [ ] Auto-accept join requests: toggle switch
- [ ] Changes saved individually (not a single form submit)
- [ ] Success toast on save

### Prediction Settings Section
- [ ] Custom prediction deadline: numeric input for "minutes before match"
- [ ] Default: 45 minutes
- [ ] Range: 15–720 minutes (0.25h to 12h)
- [ ] Label explains: "Predictions close X minutes before match start"
- [ ] Saves to `v2_gang_league_seasons.prediction_deadline_mins`

### Danger Zone Section
- [ ] "Delete Gang" destructive button
- [ ] Opens DestructiveActionDialog:
  - Title: "Delete {gangName}"
  - Description: "This will permanently delete the gang. All members will be notified. This cannot be undone."
  - Confirm value: gang name
  - Confirm label: "Delete Gang"
- [ ] Calls `deleteGang` server action
- [ ] Success: toast + redirect to dashboard

### Server Actions (`src/lib/actions/gangs.ts` — add)
- [ ] `updateGangName(gangId: string, newName: string)` → `ActionResult`
- [ ] `updateAutoAccept(gangId: string, autoAccept: boolean)` → `ActionResult`
- [ ] `updatePredictionDeadline(gangId: string, minutes: number)` → `ActionResult`
- [ ] `deleteGang(gangId: string)` → `ActionResult`
  - Calls `delete_gang` RPC
  - Fires `GANG_DELETED` analytics event
  - Revalidates `/dashboard`
- All actions: auth check + admin verification + rate limit

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       └── group/
│           └── [groupId]/
│               └── settings/
│                   └── page.tsx
├── components/
│   └── gangs/
│       ├── gang-settings-form.tsx   # Client Component
│       ├── gang-settings-form.stories.tsx
│       ├── delete-gang-section.tsx   # Client Component
│       └── delete-gang-section.stories.tsx
```

---

## Technical Notes

### Toggle Component
Install shadcn switch:
```bash
npx shadcn@latest add switch
```

### Admin Verification Pattern
```tsx
// In page.tsx (Server Component)
const gang = await getGangDetails(params.groupId)
const membership = gang.members.find(m => m.user_id === user.id)
if (membership?.role !== 'admin') redirect(`/group/${params.groupId}`)
```

### Delete Gang Flow
Uses the `delete_gang` Postgres RPC which handles:
1. Soft-delete (set `is_deleted = true`, `deleted_at = now()`)
2. Send `gang_deleted` notifications to all approved members

---

## Storybook Requirements

- `Default` — all settings with current values
- `Saving` — loading state on name save
- `DeleteDialog` — destructive confirmation open
- `DeleteLoading` — deletion in progress
