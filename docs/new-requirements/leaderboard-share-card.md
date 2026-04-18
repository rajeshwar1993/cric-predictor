# Feature: Leaderboard Share Card

## What We're Building

A shareable image card triggered from the match leaderboard that lets users brag about their ranking on social media and group chats. It serves dual purposes: fueling gang banter (retention) and creating curiosity for outsiders (acquisition). Only the sharer's position is highlighted — other members are anonymized for privacy.

### How It Differs From Existing Share Card (DSN-004)

DSN-004 is a **personal result card** ("I scored 180 pts"). This is a **leaderboard position card** ("I'm ranked #1 out of 8 in my gang"). It adds social context — the gang name, member count, and relative standing — making it more compelling for both insiders and outsiders.

## Key Requirements

### Share Card Content

- Sharer's rank badge (#1, #2, etc.) with rank-specific styling (#1 = sunburst-yellow, #2/#3 = bragg-lime, others = neutral)
- Sharer's display name + avatar
- Points scored, correct predictions count (e.g., "14/19 correct · 180 pts")
- Match context: team logos/names, match number (e.g., "MI vs CSK · Match 32")
- Gang context: gang name + member count ("Ranked #2 of 8 in The Dugout")
- Bragg branding: logo watermark + "bragg.app" URL text (drives curiosity even without a link)
- No other members' names, scores, or avatars shown

### Share Triggers / Entry Points

- **"Share" button on the sharer's own row** in the match leaderboard (icon button, always visible)
- Only shown for the **current user's row** — you can't share someone else's position
- Only enabled **after the match is completed** (all scenarios resolved) — no sharing mid-match to avoid incomplete data

### Export & Share Mechanics

- Reuse the existing `html2canvas` → PNG pipeline from DSN-004
- Mobile: `navigator.share()` with PNG file
- Desktop: download PNG (same fallback pattern as DSN-004)

### Copy Variants by Rank

| Rank | Headline | Subtext |
|------|----------|---------|
| #1 | "Top of the table" | "Leading [Gang Name]" |
| #2-3 | "On the podium" | "Ranked #N of M in [Gang Name]" |
| #4+ | "In the mix" | "Ranked #N of M in [Gang Name]" |

### Analytics

- Track `LEADERBOARD_SHARE_TRIGGERED` — fired when user taps the share button (before export completes)
- Track `LEADERBOARD_SHARE_COMPLETED` — fired when share/download completes successfully
- Track `LEADERBOARD_SHARE_CANCELLED` — fired when user cancels the native share sheet
- Payload: `{ gang_id, fixture_id, rank, points, member_count }`

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Departed member | No share button shown |
| Unranked user (no predictions) | No share button shown |
| Match still live (scenarios unresolved) | Share button disabled with tooltip "Available after match ends" |
| User not in gang | N/A — leaderboard is gang-scoped, can't access without membership |
| Gang with 1 member | Still shareable, no special handling |
| Share API unavailable (older desktop browsers) | Falls back to PNG download |
| html2canvas export fails | Toast error: "Couldn't generate image. Try again." |

## Key Decisions Made

- **Anonymize other members** — privacy-safe and forces focus on the sharer's moment. Gang name + member count gives enough social context.
- **Match leaderboard only for v1** — higher emotional charge, tied to live match energy. Season standings deferred.
- **Image-only, no landing page** — keeps scope small. `bragg.app` text on the card plants the seed for organic discovery.
- **Share only after match completion** — avoids confusing partial-data cards and prevents "I'm #1" shares that become #5 by match end.
- **Extend DSN-004 patterns, don't rebuild** — reuse `html2canvas`, `navigator.share()`, and design system tokens.

## Out of Scope (v2)

- Season standings share card
- Public landing page with CTA (`bragg.app/s/abc123`)
- Deep linking (app store redirect)
- "Challenge a friend" CTA on the card
- Gang-wide leaderboard card (showing all members)
- Auto-prompted share sheet after match ends
- Share analytics (impressions, clicks from external viewers)
