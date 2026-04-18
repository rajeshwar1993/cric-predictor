# BUG-001: Prediction Count Hidden Before Deadline + Add "Who Predicted" Pills

**Severity:** Medium
**Area:** Upcoming Matches (Match Card)
**Reported:** 2026-04-18
**Status:** Open

---

## Bug: Prediction Count Is Invisible Until the Current User Predicts

### Current Behaviour

On the gang page, each match card in the "Upcoming Matches" section displays a `{X}/{Y} predicted` counter in the footer. This counter is supposed to show how many gang members have already submitted predictions for that fixture.

**What actually happens:**
- When the current user has **not** predicted, the counter always reads **0/Y predicted** — even if other gang members have already submitted their predictions.
- When the current user submits their own prediction, the counter jumps to **1/Y predicted** — still only counting the current user, not the other members who predicted earlier.
- The counter only becomes accurate **after the prediction deadline passes** or the fixture goes live, at which point all predictions become visible.

### Expected Behaviour

The counter should reflect the **true number of gang members who have predicted**, regardless of whether the current user has predicted or not, and regardless of whether the prediction deadline has passed.

### Root Cause

The `getUpcomingFixtures()` DAL function in `web-app/src/lib/dal/fixtures.ts` (line ~133) queries the `v2_predictions` table directly to count how many users have predicted per fixture:

```typescript
const { data: predictions } = await supabase
  .from('v2_predictions')
  .select('fixture_id, user_id')
  .in('fixture_id', fixtureIds)
  .eq('gang_id', gangId)
```

This query runs through Supabase's Row Level Security. The RLS SELECT policy on `v2_predictions` (`supabase/supabase/migrations/20260406000002_rls_policies.sql`) enforces **deadline-based visibility**:

```sql
USING (
  is_gang_member(gang_id, auth.uid())
  AND (
    user_id = auth.uid()                              -- own predictions: always visible
    OR now() >= prediction_deadline(fixture_id, gang_id) -- others: only after deadline
    OR EXISTS (...)                                    -- others: only when fixture is live/completed
  )
)
```

Before the deadline, the policy filters out every row except the current user's own predictions. The DAL then counts only the visible rows, producing an incorrect (understated) count.

### Impact

- Users see **0/Y predicted** and may assume nobody in the gang has engaged with the match yet, when in reality several members may have already predicted. This reduces urgency and social proof that would motivate the user to predict.
- After the user predicts, seeing **1/Y predicted** (instead of the true count) gives a false sense of being the only one, which undermines the communal feel of the product.

---

## Enhancement: Show "Who Predicted" Pills on Match Card

### Description

In addition to fixing the count, add small pills (avatar-style badges) to the match card footer that show **which gang members have already submitted predictions** for that fixture. This gives users a quick visual signal of gang activity and creates social motivation to predict.

### Requirements

1. **Pill display:** Below or alongside the `{X}/{Y} predicted` text, render a horizontal row of small pills — one per member who has predicted.
2. **Pill content:** Each pill shows the member's **initials** (first two characters of `display_name` from `v2_profiles`). If a display name is unavailable, fall back to the first two characters of the email.
3. **Pill styling:** Follow the Electric Street design system. Pills should be small, rounded badges (similar to avatar circles). Use a muted/secondary surface colour so they don't compete with the primary CTA.
4. **Overflow:** If more than ~5 members have predicted, show the first 4-5 pills plus a "+N" overflow pill (e.g., `+3`) to keep the card compact.
5. **Visibility rules:**
   - Pills are visible **at all times** during the prediction window — users can see *who* has predicted but not *what* they predicted.
   - After the deadline, pills remain visible.
6. **Empty state:** When no one has predicted, do not show any pills. The `0/Y predicted` text is sufficient.

### Data Requirements

The fix must provide the following data for each upcoming fixture:

| Field | Type | Description |
|---|---|---|
| `predictedCount` | `number` | Total distinct users who have predicted for this fixture in this gang |
| `predictedMembers` | `Array<{ userId: string; displayName: string }>` | List of members who predicted, with enough info to render initials |

This data must **bypass the existing RLS deadline restriction** for counting/identity purposes only (never expose *what* a user predicted before the deadline). The recommended approach is a `SECURITY DEFINER` Postgres RPC that:
- Accepts `fixture_ids` (array) and `gang_id` as parameters
- Validates the caller is an approved member of the gang
- Returns the `user_id` and `display_name` of each member who has at least one prediction row for each fixture
- Does **not** return any prediction content (scenario choices, option selections)

---

## Affected Files

### Database / Supabase
- **New migration** — Create a `SECURITY DEFINER` RPC (e.g., `get_fixture_prediction_members`) that returns `fixture_id`, `user_id`, and `display_name` for all gang members who have predicted, bypassing the deadline-based RLS restriction on `v2_predictions`.

### Data Access Layer
- **`web-app/src/lib/dal/fixtures.ts`** — Replace the direct `v2_predictions` query in `getUpcomingFixtures()` with a call to the new RPC. Update the `UpcomingFixture` type to include the `predictedMembers` array.

### UI Components
- **`web-app/src/components/matches/match-card.tsx`** — Accept and render the `predictedMembers` array as pills in the card footer, alongside the existing count text.
- **New component: `web-app/src/components/matches/prediction-avatars.tsx`** — Reusable component that renders a row of initial-pills with overflow logic. Can be used on match cards and potentially elsewhere.
- **`web-app/src/components/matches/upcoming-matches.tsx`** — Pass the new `predictedMembers` data through to `MatchCard`.

### Storybook
- **`prediction-avatars.stories.tsx`** — Stories for: `NoPredictions`, `FewMembers` (1-3), `FullRow` (4-5), `Overflow` (6+).
- **Update `match-card.stories.tsx`** — Update `WithPredictionCount` story to include pills. Add a new `WithManyPredictions` story showing overflow.

---

## Acceptance Criteria

- [ ] The `{X}/{Y} predicted` count reflects the true number of gang members who have predicted, at all times (before and after deadline).
- [ ] Small pills showing member initials appear on each match card for members who have predicted.
- [ ] Pills are visible during the prediction window (before deadline) without revealing prediction content.
- [ ] Overflow is handled gracefully: 5+ predicted members shows first 4 pills + a "+N" indicator.
- [ ] Empty state: no pills rendered when `predictedCount` is 0.
- [ ] The RPC validates that the calling user is an approved member of the gang before returning data.
- [ ] The RPC does **not** return any prediction content — only user identity.
- [ ] Existing RLS policy on `v2_predictions` is not weakened (individual prediction content remains hidden until after deadline).
- [ ] All affected Storybook stories are updated/created.
- [ ] Unit tests cover the new RPC call in the DAL.
- [ ] ESLint passes with zero errors and zero warnings.
