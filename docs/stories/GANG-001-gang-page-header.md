# GANG-001: Gang Page Shell + Header + Invite

**Phase:** 7 — Gang Page
**Dependencies:** DASH-001, DSN-002
**Estimated scope:** Gang page composition, header section, invite link sharing

---

## Description

Build the gang page (`/group/[groupId]`) — the central hub for a gang. This story covers the page shell (Server Component), gang header with name/member count, and invite sharing functionality. Match sections, member list, and leave gang come in subsequent stories.

---

## Acceptance Criteria

### Gang Page (`src/app/(app)/group/[groupId]/page.tsx`)
- [ ] Server Component: fetches gang details, fixtures, members via DAL
- [ ] Verifies user is an approved member (redirects to dashboard if not)
- [ ] Composes: GangHeader, PendingRequests (admin), UpcomingMatches, LiveMatches, RecentResults, MemberList, LeaveGang
- [ ] Uses Suspense boundaries around async data sections
- [ ] Page title: gang name

### Gang Header (`src/components/gangs/gang-header.tsx`)
- [ ] Gang name: H1 style (Space Grotesk 700, uppercase)
- [ ] Member count: "X/20 members" in body small style
- [ ] Invite actions row:
  - "Copy invite link" button (secondary) — copies `{APP_URL}/join/{inviteCode}` to clipboard
  - "Share" button (secondary) — triggers native share API on mobile, falls back to copy
- [ ] Link to Season Standings page: "Season Standings →"
- [ ] Admin-only: link to Gang Settings (gear icon or "Settings" link)

### Invite Share (`src/components/gangs/invite-share.tsx`) — Client Component
- [ ] Copy to clipboard button: copies full invite URL
- [ ] On copy: button text changes to "Copied!" for 2 seconds, then reverts
- [ ] Share button (mobile): uses `navigator.share()` with:
  - Title: "Join {gangName} on Bragg"
  - Text: "{inviterName} invited you to join {gangName}. Use code {inviteCode} or click the link."
  - URL: invite link
- [ ] Share button (desktop): falls back to copy behavior
- [ ] Fires `INVITE_COPIED` or `INVITE_SHARED` analytics event

### DAL Functions (`src/lib/dal/gangs.ts` — add)
- [ ] `getGangDetails(gangId: string)` → gang with members, league season settings
- [ ] `getGangMemberStatus(gangId: string, userId: string)` → member record or null

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       └── group/
│           └── [groupId]/
│               ├── page.tsx
│               └── layout.tsx      # Optional — group-level layout
├── components/
│   └── gangs/
│       ├── gang-header.tsx
│       ├── gang-header.stories.tsx
│       ├── invite-share.tsx
│       └── invite-share.stories.tsx
├── lib/
│   └── dal/
│       └── gangs.ts                # UPDATE — add getGangDetails
```

---

## Technical Notes

### Page Composition
```tsx
export default async function GangPage({ params }: { params: { groupId: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const gang = await getGangDetails(params.groupId)
  if (!gang) notFound()

  // Check membership
  const membership = gang.members.find(m => m.user_id === user.id)
  if (!membership || membership.status !== 'approved') redirect('/dashboard')

  const isAdmin = membership.role === 'admin'

  return (
    <PageWrapper>
      <GangHeader gang={gang} isAdmin={isAdmin} />

      {isAdmin && (
        <Suspense fallback={null}>
          <PendingRequests gangId={gang.id} />
        </Suspense>
      )}

      <Suspense fallback={<MatchListSkeleton />}>
        <UpcomingMatches gangId={gang.id} />
      </Suspense>

      <LiveMatchesSection gangId={gang.id} />

      <Suspense fallback={<MatchListSkeleton count={3} />}>
        <RecentResults gangId={gang.id} userId={user.id} />
      </Suspense>

      <Suspense fallback={<LeaderboardSkeleton />}>
        <MemberList gangId={gang.id} currentUserId={user.id} />
      </Suspense>

      {!isAdmin && <LeaveGangButton gangId={gang.id} gangName={gang.name} />}
    </PageWrapper>
  )
}
```

### getGangDetails DAL
```typescript
export async function getGangDetails(gangId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('v2_gangs')
    .select(`
      id, name, invite_code, auto_accept, created_by,
      v2_gang_members (user_id, role, status, v2_profiles (display_name, email)),
      v2_gang_league_seasons (prediction_deadline_mins, season_id, league_id)
    `)
    .eq('id', gangId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}
```

### Invite URL Format
```
https://bragg.app/join/{inviteCode}
```
Built from `NEXT_PUBLIC_APP_URL` env variable + `/join/` + invite code.

---

## Storybook Requirements

### GangHeader Stories
- `Admin` — shows settings link + full header
- `Member` — no settings link
- `LongName` — truncation handling
- `FullGang` — "20/20 members"

### InviteShare Stories
- `Default` — copy + share buttons
- `Copied` — "Copied!" feedback state
- `NoShareAPI` — desktop fallback (no share button)
