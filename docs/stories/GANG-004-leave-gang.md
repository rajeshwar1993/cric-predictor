# GANG-004: Leave Gang

**Phase:** 7 — Gang Page
**Dependencies:** GANG-001, DSN-003
**Estimated scope:** Leave gang button with destructive confirmation dialog

---

## Description

Build the leave gang functionality at the bottom of the gang page. Only visible to members (not admins — admins must delete the gang instead). Uses the DestructiveActionDialog for confirmation.

---

## Acceptance Criteria

- [ ] "Leave Gang" button at bottom of gang page (destructive variant)
- [ ] Only visible to members, NOT to admin
- [ ] Clicking opens DestructiveActionDialog
  - Title: "Leave {gangName}"
  - Description: "You will lose access to this gang. Your predictions and standings will remain visible to other members. You can rejoin later with an invite code."
  - Confirm value: gang name (user must type it)
  - Confirm label: "Leave Gang"
- [ ] On confirm: calls `leaveGang` server action
- [ ] Success: toast "You have left {gangName}" + redirect to dashboard
- [ ] Error: toast with error message

### Server Action (`src/lib/actions/gangs.ts` — add)
- [ ] `leaveGang(gangId: string)` → `ActionResult`
- [ ] Auth check
- [ ] Verify user is member (not admin) — admin cannot leave
- [ ] Update `v2_gang_members`: status = `left`, `departed_at` = now
- [ ] Revalidate `/dashboard` and `/group/{gangId}`
- [ ] Fire `MEMBER_LEFT` analytics event

---

## Files to Create

```
web-app/src/components/gangs/
├── leave-gang-button.tsx           # Client Component
└── leave-gang-button.stories.tsx
```

---

## Technical Notes

- Admin check: if user tries to call `leaveGang` as admin, return `{ success: false, error: "Admins cannot leave. Delete the gang instead." }`
- After leaving, the member still appears in standings (grayed out) but loses access to the gang page (middleware/page check will redirect)

---

## Storybook Requirements

- `Default` — button visible
- `DialogOpen` — confirmation dialog shown
- `TypedConfirmation` — user has typed gang name, confirm enabled
- `Loading` — leaving in progress
