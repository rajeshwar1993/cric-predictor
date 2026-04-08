# SET-002: Member Management

**Phase:** 11 — Gang Settings
**Dependencies:** SET-001
**Estimated scope:** Admin member management — remove, block, unblock members

---

## Description

Build the member management section within gang settings. Admins can remove members, block/unblock members. Approve/reject is handled in GANG-002 (pending requests section on gang page).

---

## Acceptance Criteria

### Member Management Section (within gang settings page)
- [ ] Section title: "MEMBERS"
- [ ] List of all members (approved + left + removed, excluding pending)
- [ ] Each member row shows: avatar, display name, role badge, status, action buttons
- [ ] Approved members: "Remove" button, "Block" button
- [ ] Blocked members: "Unblock" button
- [ ] Left/removed members: grayed out, shows status
- [ ] Admin's own row: no action buttons (can't remove/block self)
- [ ] Remove: opens DestructiveActionDialog (type member's display name)
- [ ] Block: immediate action with confirmation toast
- [ ] Unblock: immediate action with confirmation toast

### Server Actions (`src/lib/actions/gangs.ts` — add)
- [ ] `removeMember(gangId: string, userId: string)` → `ActionResult`
  - Auth check + admin verification
  - Update status to `removed`, set `departed_at`
  - Fire `MEMBER_REMOVED` analytics event
  - Revalidate gang page + settings
- [ ] `blockMember(gangId: string, userId: string)` → `ActionResult`
  - Sets `is_blocked = true` on the member record
  - If member is currently approved: also set status to `removed`
  - Blocked members cannot rejoin even with auto-accept
- [ ] `unblockMember(gangId: string, userId: string)` → `ActionResult`
  - Sets `is_blocked = false`
  - Does NOT auto-reinstate — member must request to join again

---

## Files to Create

```
web-app/src/components/gangs/
├── member-management.tsx
├── member-management.stories.tsx
├── member-row-admin.tsx            # Admin view of a member with action buttons
└── member-row-admin.stories.tsx
```

---

## Technical Notes

### Member States
| Status | is_blocked | UI Display | Available Actions |
|--------|-----------|------------|-------------------|
| approved | false | Active member | Remove, Block |
| approved | true | Should not happen (block also removes) | — |
| removed | false | "Removed" grayed out | — |
| removed | true | "Blocked" grayed out | Unblock |
| left | false | "Left" grayed out | — |
| left | true | "Left & Blocked" grayed out | Unblock |

### Remove Confirmation Dialog
```tsx
<DestructiveActionDialog
  title={`Remove ${memberName}`}
  description="This member will lose access to the gang. Their predictions and standings will remain visible. They can rejoin with an invite code."
  confirmValue={memberName}
  confirmLabel="Remove Member"
  onConfirm={() => removeMember(gangId, memberId)}
/>
```

---

## Storybook Requirements

- `Default` — mix of approved, removed, blocked members
- `AllActive` — all members approved
- `RemoveDialog` — confirmation dialog open
- `Loading` — action in progress
