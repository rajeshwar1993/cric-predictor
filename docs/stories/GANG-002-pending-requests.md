# GANG-002: Pending Join Requests (Admin)

**Phase:** 7 — Gang Page
**Dependencies:** GANG-001
**Estimated scope:** Admin-only section showing pending join requests with approve/reject

---

## Description

Build the pending join requests section visible only to gang admins. Shows a list of users who have requested to join with approve and reject buttons.

---

## Acceptance Criteria

### Pending Requests Section (`src/components/gangs/pending-requests.tsx`)
- [ ] Only rendered when current user is admin
- [ ] Fetches pending members via DAL
- [ ] Shows nothing if no pending requests (no empty state needed)
- [ ] Section title: "PENDING REQUESTS" (caption style)
- [ ] Each request shows: avatar, display name, "requested X ago" timestamp
- [ ] Approve button (primary, small): approves and adds member
- [ ] Reject button (ghost, small): rejects the request
- [ ] Optimistic UI: row disappears immediately on action
- [ ] Success/error toast feedback

### Server Actions (`src/lib/actions/gangs.ts` — add)
- [ ] `approveJoinRequest(gangId: string, userId: string)` → `ActionResult`
  - Auth check + admin verification
  - Rate limit: 60 per hour
  - Check gang member limit (< 20)
  - Check display name uniqueness
  - Update `v2_gang_members` status to `approved`, set `approved_at`
  - Send `join_approved` notification to the user
  - Revalidate gang page
  - Fire `MEMBER_APPROVED` analytics event
- [ ] `rejectJoinRequest(gangId: string, userId: string)` → `ActionResult`
  - Auth check + admin verification
  - Update `v2_gang_members` status to `rejected`
  - Send `join_rejected` notification to the user
  - Revalidate gang page
  - Fire `MEMBER_REJECTED` analytics event

### DAL (`src/lib/dal/gangs.ts` — add)
- [ ] `getPendingRequests(gangId: string)` → pending members with profile info

---

## Files to Create

```
web-app/src/components/gangs/
├── pending-requests.tsx
├── pending-requests.stories.tsx
├── pending-request-card.tsx
└── pending-request-card.stories.tsx
```

---

## Technical Notes

### Approve Action — Required Fields
On approve, the server action must:
1. Check display name uniqueness (see below)
2. Update the member row with **both** `status = 'approved'` AND `approved_at = new Date().toISOString()` — the `approved_at` timestamp is required by the `check_max_gang_members` trigger and is used for admin succession ordering in `delete_account` RPC
3. Revalidate paths: `/group/{gangId}` and `/group/{gangId}/settings`

### Display Name Uniqueness Check
On approve, the server action must check if the pending member's display name collides with any existing approved member in the gang. If collision → reject with error: "A member with the same display name already exists in this gang."

### Notification Payload
```typescript
// join_approved notification
await supabase.from('v2_notifications').insert({
  user_id: requesterId,
  type: 'join_approved',
  message: `Your request to join ${gangName} has been approved!`,
  gang_id: gangId,
})
```

---

## Storybook Requirements

- `NoPending` — empty (renders nothing)
- `OneRequest` — single pending member
- `MultipleRequests` — 3 pending members
- `ApproveLoading` — approve button loading
- `RejectLoading` — reject button loading
