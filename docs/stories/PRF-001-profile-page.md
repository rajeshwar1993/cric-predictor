# PRF-001: Profile Page

**Phase:** 12 — Profile & Account
**Dependencies:** LAY-002, DSN-002
**Estimated scope:** Profile page with editable display name, stats overview, delete account link

---

## Description

Build the profile page (`/profile`) showing user info, overall stats, and account actions.

---

## Acceptance Criteria

### Profile Page
- [ ] Route: `/profile`
- [ ] Page title: "PROFILE"

### Profile Info Section
- [ ] Large avatar with initials (56px)
- [ ] Display name: editable inline (click to edit, or dedicated edit button)
  - 2–30 characters after trim
  - Save button + cancel
  - Success toast on save
- [ ] Email address: read-only, shown in body small style
- [ ] Date of birth: read-only, formatted as "28 Mar 2026"
- [ ] Member since: "Joined {date}"

### Stats Overview Section
- [ ] Uses StatBlock components in a 2×2 grid
- [ ] Stats computed from `v2_gang_season_standings` across all gangs:
  - Total gangs joined (count of active memberships)
  - Total matches predicted
  - Overall accuracy percentage
  - Total points across all gangs
- [ ] Empty state if no predictions yet: "Start predicting to see your stats"

### Account Actions Section
- [ ] "Delete Account" link → navigates to delete account flow (PRF-002)

### Server Action (`src/lib/actions/profile.ts` — create)
- [ ] `updateDisplayName(newName: string)` → `ActionResult`
- [ ] Auth check
- [ ] Rate limit: 10 per hour
- [ ] Validate: 2–30 chars after trim
- [ ] Check display name uniqueness across all approved gang memberships
  - If collision in any gang → error with gang name(s) specified
- [ ] Update `v2_profiles.display_name`
- [ ] Revalidate `/profile` and all user's gang pages
- [ ] Fire analytics event

### DAL (`src/lib/dal/profile.ts` — create)
- [ ] `getProfileStats(userId: string)` → aggregated stats across all gangs

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       └── profile/
│           └── page.tsx
├── components/
│   └── profile/
│       ├── profile-info.tsx
│       ├── profile-info.stories.tsx
│       ├── profile-stats.tsx
│       └── profile-stats.stories.tsx
├── lib/
│   ├── actions/
│   │   └── profile.ts              # CREATE
│   └── dal/
│       └── profile.ts              # CREATE
```

---

## Technical Notes

### Profile Stats Query
```typescript
export async function getProfileStats(userId: string) {
  const supabase = await createServerClient()

  // Get gangs count
  const { count: gangsCount } = await supabase
    .from('v2_gang_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved')

  // Get aggregated season stats
  const { data: standings } = await supabase
    .from('v2_gang_season_standings')
    .select('total_points, matches_predicted, total_correct, total_resolved')
    .eq('user_id', userId)

  const totalPoints = standings?.reduce((sum, s) => sum + s.total_points, 0) ?? 0
  const totalPredicted = standings?.reduce((sum, s) => sum + s.matches_predicted, 0) ?? 0
  const totalCorrect = standings?.reduce((sum, s) => sum + s.total_correct, 0) ?? 0
  const totalResolved = standings?.reduce((sum, s) => sum + s.total_resolved, 0) ?? 0
  const accuracy = totalResolved > 0 ? (totalCorrect / totalResolved) * 100 : 0

  return { gangsCount: gangsCount ?? 0, totalPredicted, accuracy, totalPoints }
}
```

### Display Name Uniqueness Across Gangs
When a user changes their display name, check all gangs where they are an approved member to see if the new name collides with another approved member.

---

## Storybook Requirements

### ProfileInfo Stories
- `Default` — with name, email, DOB
- `Editing` — name edit mode
- `ValidationError` — name too short

### ProfileStats Stories
- `Default` — all 4 stat blocks
- `NewUser` — all zeros / empty state
- `HighAccuracy` — 85% accuracy showcase
