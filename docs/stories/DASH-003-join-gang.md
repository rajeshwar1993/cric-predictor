# DASH-003: Join Gang + Pending Invite Banner

**Phase:** 5 — Dashboard
**Dependencies:** DASH-001
**Estimated scope:** Join gang by invite code form + pending invite banner from localStorage

---

## Description

Build the join gang form (enter invite code) on the dashboard, and the pending invite banner that appears when a user arrives via an invite link flow (stored in localStorage from the join page).

---

## Acceptance Criteria

### Join Gang Form (`src/components/gangs/join-gang-form.tsx`) — Client Component
- [ ] Input: "Invite code" with label, placeholder "e.g., BRAGG-XK42"
- [ ] Validation: non-empty, 6 characters (uppercase alphanumeric)
- [ ] Submit button: "Join Gang" (secondary variant)
- [ ] Loading state while joining
- [ ] Success states:
  - Auto-accept on → toast "You're in!" + redirect to gang page
  - Auto-accept off → toast "Request sent! Waiting for admin approval."
- [ ] Error states:
  - Invalid code → "Invalid invite code"
  - Already a member → redirect to gang page
  - Gang full → "This gang has reached its maximum of 20 members"
  - Blocked → "You are not able to join this gang"
  - Gang deleted → "This gang no longer exists"
  - Already pending → "Your request is pending admin approval"

### Pending Invite Banner (`src/components/gangs/pending-invite-banner.tsx`) — Client Component
- [ ] Checks localStorage for stored invite on mount
- [ ] Shows banner: "You've been invited to join **{gangName}**"
- [ ] "Join" button and "Dismiss" button
- [ ] Auto-expires: clears from localStorage after 24 hours
- [ ] Join button triggers the same join flow as the form
- [ ] Dismiss removes from localStorage and hides banner
- [ ] Positioned at top of dashboard, above gangs grid

### Server Action (`src/lib/actions/gangs.ts` — add to existing)
- [ ] `joinGangByCode(inviteCode: string)` → `ActionResult<{ gangId: string; status: 'approved' | 'pending' }>`
- [ ] Auth check
- [ ] Rate limit: 20 per hour
- [ ] Look up gang by invite code using `get_gang_by_invite_code` RPC (bypasses RLS)
- [ ] Check if gang exists and is not deleted
- [ ] Check if user is already a member (handle: already approved → redirect, already pending → message)
- [ ] Check gang member limit (< 20 approved)
- [ ] Check if user is blocked
- [ ] Check display name uniqueness within gang
- [ ] If auto-accept: insert member as approved, send `new_member` notification to admin
- [ ] If not auto-accept: insert member as pending, send `join_request` notification to admin
- [ ] Revalidate `/dashboard` and `/group/{gangId}`
- [ ] Fire `JOIN_REQUESTED` analytics event

### localStorage Schema
```typescript
interface PendingInvite {
  code: string
  gangName: string
  storedAt: number  // Date.now() timestamp
}
// Key: 'bragg_pending_invite'
// Expires: 24 hours (check storedAt on read)
```

---

## Files to Create

```
web-app/src/
├── components/
│   └── gangs/
│       ├── join-gang-form.tsx
│       ├── join-gang-form.stories.tsx
│       ├── pending-invite-banner.tsx
│       └── pending-invite-banner.stories.tsx
├── lib/
│   └── actions/
│       └── gangs.ts                # UPDATE — add joinGangByCode
```

---

## Technical Notes

### Join Flow
```
User enters invite code → joinGangByCode(code)
  ↓
Lookup gang via get_gang_by_invite_code RPC
  ↓
Check membership status:
  - Approved → return error "already a member" (client redirects)
  - Pending → return error "request pending"
  - Rejected → allow re-request (upsert with status pending, update requested_at)
  - Left → allow rejoin (upsert with status pending/approved based on auto_accept)
  - Removed → allow rejoin if not blocked
  - Blocked → return error
  - No record → new join request
  ↓
If auto_accept → insert/update as approved
If !auto_accept → insert/update as pending
  ↓
Send notification to admin
```

### Pending Invite Banner
```tsx
'use client'
export function PendingInviteBanner() {
  const [invite, setInvite] = useState<PendingInvite | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('bragg_pending_invite')
    if (!stored) return
    const parsed = JSON.parse(stored) as PendingInvite
    // Check 24h expiry
    if (Date.now() - parsed.storedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('bragg_pending_invite')
      return
    }
    setInvite(parsed)
  }, [])

  if (!invite) return null

  return (
    <div className="bg-lime-wash border border-lime-wire rounded-lg p-4 mb-6 flex items-center justify-between">
      <p>You've been invited to join <strong>{invite.gangName}</strong></p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleJoin}>Join</Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>Dismiss</Button>
      </div>
    </div>
  )
}
```

---

## Storybook Requirements

### JoinGangForm Stories
- `Default` — empty form
- `WithCode` — code entered
- `Loading` — submitting
- `SuccessApproved` — "You're in!" message
- `SuccessPending` — "Request sent" message
- `InvalidCode` — error state
- `GangFull` — error state
- `Blocked` — error state

### PendingInviteBanner Stories
- `Default` — with invite data
- `Hidden` — no pending invite (renders null)
