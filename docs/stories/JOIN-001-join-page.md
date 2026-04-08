# JOIN-001: Join Page (Auth + Unauth Flows)

**Phase:** 6 — Join Flow
**Dependencies:** AUTH-001, DASH-003
**Estimated scope:** Join page at `/join/[code]` handling both authenticated and unauthenticated users

---

## Description

Build the join page that handles invite links (`/join/[code]`). This is a public route — it works differently for authenticated vs unauthenticated users. Unauth users see the login form; auth users see the join confirmation.

---

## Acceptance Criteria

### Unauthenticated Flow
- [ ] App logo + "BRAGG" heading
- [ ] Shows gang name they've been invited to (fetched by invite code)
- [ ] "You've been invited to join **{gangName}**"
- [ ] Login form (same magic link form as `/login`)
- [ ] Stores invite info in localStorage: `{ code, gangName, storedAt }`
- [ ] After login → callback → onboarding (if needed) → dashboard → banner picks up invite

### Authenticated Flow
- [ ] NavBar shown (they're logged in)
- [ ] Shows gang name with invite confirmation
- [ ] "Join Gang" primary button
- [ ] Handles all states after action:
  - Auto-accept on → "You're in!" with link to gang page
  - Auto-accept off → "Request sent, waiting for admin approval"
  - Already approved → auto-redirect to gang page
  - Already pending → "Your request is pending approval"
  - Rejected → "Your previous request was declined. Request again?" with retry button
  - Gang full → "This gang has reached its maximum members"
  - Blocked → "You are not able to join this gang"
  - Gang deleted → "This gang no longer exists"

### DAL Function (`src/lib/dal/gangs.ts` — add)
- [ ] `getGangByInviteCode(code: string)` → gang name + basic info (uses `get_gang_by_invite_code` RPC)
- [ ] `getMembershipStatus(gangId: string, userId: string)` → current membership status or null

---

## Files to Create

```
web-app/src/app/
└── (public)/
    └── join/
        └── [code]/
            └── page.tsx

web-app/src/components/
└── gangs/
    ├── join-page-unauth.tsx        # Client Component (unauth flow)
    ├── join-page-auth.tsx          # Client Component (auth flow)
    ├── join-page-unauth.stories.tsx
    └── join-page-auth.stories.tsx
```

---

## Technical Notes

### Page Logic
```tsx
// page.tsx — can be Server Component
export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch gang info by invite code (public RPC, no auth needed)
  const gang = await getGangByInviteCode(params.code)

  if (!gang) {
    return <JoinPageError message="This invite link is invalid or the gang no longer exists." />
  }

  if (!user) {
    return <JoinPageUnauth gangName={gang.name} inviteCode={params.code} />
  }

  // Check if already a member
  const membership = await getMembershipStatus(gang.id, user.id)

  if (membership?.status === 'approved') {
    redirect(`/group/${gang.id}`)
  }

  return <JoinPageAuth gang={gang} existingStatus={membership?.status} inviteCode={params.code} />
}
```

### localStorage Storage (unauth flow)
```typescript
// When unauth user views join page:
localStorage.setItem('bragg_pending_invite', JSON.stringify({
  code: inviteCode,
  gangName: gangName,
  storedAt: Date.now(),
}))
```

### Join Action
Reuses `joinGangByCode()` from DASH-003. The join page calls the same server action.

### Metadata
```tsx
export async function generateMetadata({ params }: { params: { code: string } }) {
  const gang = await getGangByInviteCode(params.code)
  return {
    title: gang ? `Join ${gang.name}` : 'Join a Gang',
    description: gang ? `You've been invited to join ${gang.name} on Bragg` : 'Join a prediction gang on Bragg',
  }
}
```

---

## Storybook Requirements

### JoinPageUnauth Stories
- `Default` — shows gang name + login form
- `InvalidCode` — gang not found

### JoinPageAuth Stories
- `Default` — join confirmation
- `AlreadyPending` — request pending message
- `Rejected` — retry option
- `GangFull` — max members message
- `Blocked` — cannot join message
- `GangDeleted` — gang no longer exists
- `Success` — "You're in!" state
- `PendingApproval` — "Request sent" state
