# Bragg — Design System Specification

**Theme:** Stadium Nightscape
**Last updated:** March 26, 2026
**Interactive preview:** See `ipl-predict-design-system.jsx` artifact

---

## 1. Design Philosophy

Inspired by the electric energy of a T20 night match under floodlights. Dark layered surfaces create depth like a stadium at dusk. Electric cyan accents cut through like floodlight beams. Amber gold marks achievements — the trophy glow. Designed for the 7:30 PM match-day experience.

**Principles:**
- Dark-first — optimized for nighttime viewing during matches
- High contrast — scores readable at a glance on any screen
- Motion-aware — leaderboard shifts and score updates feel alive
- Mobile-native — thumb-friendly, one-hand use, compact information density

---

## 2. Color Palette

### 2.1 Surfaces (Layered Dark)

Each surface layer adds ~5% brightness. The subtle blue undertone creates depth without feeling grey.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-deep` | `#06080F` | Deepest background — app shell, body |
| `--bg-primary` | `#0B0F1A` | Page backgrounds |
| `--bg-card` | `#111827` | Card surfaces, list items |
| `--bg-elevated` | `#1A2236` | Modals, dropdowns, elevated panels |
| `--bg-hover` | `#1F2A40` | Hover state on cards/buttons |
| `--bg-input` | `#0F1525` | Input field backgrounds |

### 2.2 Primary Accent — Electric Cyan

The hero color. Used for CTAs, active states, links, "on track" indicators, and key interactive elements.

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#00E5FF` | Primary buttons, active tabs, links, "on track" |
| `--accent-soft` | `#00E5FF1A` (10% opacity) | Subtle highlighted backgrounds |
| `--accent-medium` | `#00E5FF33` (20% opacity) | Hover backgrounds |
| `--accent-glow` | `0 0 20px #00E5FF40, 0 0 60px #00E5FF15` | Box-shadow on hero buttons and live indicators (use sparingly) |

### 2.3 Secondary Accent — Amber Gold

Points, ranks, achievements, season champion. The warmth contrasts the cool cyan.

| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#FFB800` | #1 rank, point displays, trophies, awards |
| `--gold-soft` | `#FFB80015` (8% opacity) | Gold-tinted backgrounds |

### 2.4 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#34D399` | ✅ Correct predictions |
| `--danger` | `#F87171` | ❌ Wrong predictions, LIVE badge |
| `--warning` | `#FBBF24` | 🔴 "In danger" indicator |
| `--pending` | `#64748B` | ⏳ Unresolved / pending |

**Prediction status pill formula:**
- Background: `{color}18` (9% opacity)
- Border: `{color}40` (25% opacity)
- Text: `{color}` (full)
- Dot indicator: 6×6px circle, `{color}` fill

### 2.5 Text Hierarchy

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#F1F5F9` | Headlines, primary content, names |
| `--text-secondary` | `#94A3B8` | Body text, descriptions |
| `--text-muted` | `#475569` | Disabled, tertiary info, timestamps |
| `--text-inverse` | `#0B0F1A` | Text on light/accent backgrounds |

### 2.6 Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `#FFFFFF08` (3%) | Barely visible structure lines |
| `--border-light` | `#FFFFFF12` (7%) | Card borders, dividers |
| `--border-medium` | `#FFFFFF20` (12%) | Input borders, unselected buttons |
| `--border-focus` | `#00E5FF50` (31%) | Focus rings on inputs |

### 2.7 IPL Team Colors

| Team | Hex | Text Color |
|------|-----|-----------|
| CSK | `#F9CD05` | Dark (`--bg-deep`) |
| MI | `#004BA0` | White |
| RCB | `#EC1C24` | Dark |
| KKR | `#3B215D` | White |
| DC | `#004C93` | White |
| SRH | `#F26522` | Dark |
| RR | `#EA1A85` | Dark |
| PBKS | `#ED1B24` | Dark |
| GT | `#1C1C2B` | White |
| LSG | `#A72056` | White |

Team colors are used for team badges (44×44px circles), match card accents, and selected-team highlights on prediction cards.

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Google Fonts URL |
|------|------|-----------------|
| Display / Headlines | **Chakra Petch** (400, 500, 600, 700) | `family=Chakra+Petch:wght@400;500;600;700` |
| Body / UI | **DM Sans** (400, 500, 600, 700) | `family=DM+Sans:wght@400;500;600;700` |
| Numbers / Stats | **JetBrains Mono** (400, 500, 600) | `family=JetBrains+Mono:wght@400;500;600` |

**Why these fonts:**
- **Chakra Petch:** Geometric, sporty, techy. Has a motorsport/esports feel. Used for all headings, scenario titles, team names, and navigation.
- **DM Sans:** Clean geometric sans with excellent small-size readability. All body text, descriptions, form labels.
- **JetBrains Mono:** Monospaced for perfect column alignment in leaderboards. All scores, points, percentages, countdowns, stats.

### 3.2 Type Scale

| Level | Font | Size | Weight | Letter Spacing | Usage |
|-------|------|------|--------|---------------|-------|
| H1 | Chakra Petch | 32px | 700 | -0.03em | Page titles ("Season Standings") |
| H2 | Chakra Petch | 24px | 700 | -0.02em | Section headers ("CSK vs MI — Match 14") |
| H3 | Chakra Petch | 18px | 600 | -0.01em | Card titles ("Your Predictions") |
| H4 | Chakra Petch | 14px | 600 | 0 | Scenario titles ("Who will win the toss?") |
| Body | DM Sans | 14px | 400 | 0 | Descriptions, instructions |
| Small | DM Sans | 12px | 400 | 0 | Captions, timestamps, secondary info |
| Mono/Stats | JetBrains Mono | 13px | 500 | 0 | Scores, points, percentages |
| Mono/Large | JetBrains Mono | 22px | 700 | 0 | Hero stat numbers (season points, rank) |
| Badge/Label | Chakra Petch | 10-11px | 600 | 0.1em | Uppercase labels, badges, tags |

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (8px grid)

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `xxl` | 48px |
| `xxxl` | 64px |

### 4.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Small buttons, badges |
| `md` | 10px | Buttons, inputs, small cards |
| `lg` | 14px | Medium cards, dropdowns |
| `xl` | 20px | Large cards, match cards |
| `full` | 9999px | Pills, team badges, avatars |

### 4.3 Layout Patterns

- **Max content width:** 960px (centered)
- **Mobile breakpoint:** 640px
- **Card padding:** 20-24px
- **Section gap:** 32-48px
- **Card gap:** 16px
- **Form field gap:** 16px vertical

---

## 5. Component Specifications

### 5.1 Buttons

**Primary (gradient):**
- Background: `linear-gradient(135deg, #00E5FF, #00B8D4)`
- Text: `--bg-deep`, Chakra Petch 14px/600
- Padding: 12px 28px, radius: `md`
- Shadow: `--accent-glow`
- Hover: opacity 0.9

**Secondary (outline):**
- Background: transparent
- Border: `1px solid {accent}50`
- Text: `--accent`, Chakra Petch 14px/600
- Padding: 12px 28px, radius: `md`

**Ghost:**
- Background: `--bg-elevated`
- Border: `1px solid --border-light`
- Text: `--text-secondary`, DM Sans 13px/500
- Padding: 10px 20px, radius: `md`

### 5.2 Match Card

- Background: `linear-gradient(135deg, --bg-card, --bg-elevated)`
- Border: `1px solid --border-light`
- Radius: `xl` (20px)
- Padding: 24px
- Contains: match badge (top-left), deadline badge (top-right), team badges (44px circles with team color), VS divider, venue text, and full-width CTA button

### 5.3 Leaderboard Row

- Height: ~48px
- Padding: 12px 16px
- Current user row: background `--accent-soft`, border `1px solid {accent}30`
- #1 rank: `--gold` color
- #2 rank: `--accent` color
- #3+ rank: `--text-secondary` color
- Points: JetBrains Mono 15px/600, right-aligned
- "pts" suffix: 10px, `--text-muted`

### 5.4 Scenario Pick Card

- Background: `--bg-card`
- Border: `1px solid --border-light`
- Radius: `lg`
- Padding: 20px
- Title: Chakra Petch 13px/600
- Points badge: 11px, `--text-muted`
- Option buttons: radius `md`, unselected = transparent + `--border-medium`, selected = team-color background (25% opacity) + team-color border (2px)

### 5.5 Prediction Status Pills

- Radius: `full` (pill shape)
- Padding: 7px 14px
- Font: JetBrains Mono 11px/500
- Left dot: 6×6px circle
- Variants: Correct (green), Wrong (red), On Track (cyan), In Danger (amber), Pending (grey)

### 5.6 Points Badge

- Radius: `lg`
- Padding: 14px 24px
- Number: JetBrains Mono 22px/700, color = badge color
- Label: DM Sans 10px, `--text-muted`
- Background: badge color at 8-15% opacity

### 5.7 Input Fields

- Background: `--bg-input`
- Border: `1px solid --border-medium`
- Radius: `md`
- Padding: 12px 16px
- Font: DM Sans 14px
- Placeholder: `--text-muted`
- Focus: `ring-2 ring-{accent}50`

### 5.8 Group Switcher (During Live Match)

- Inline flex, background: `--bg-card`
- Radius: `lg`, overflow hidden
- Tab buttons separated by `--border-subtle` vertical dividers
- Active tab: background `--accent-soft`, text `--accent`
- Rank badge: JetBrains Mono 10px/600 in a pill. #1 = gold background, others = `--bg-elevated`

### 5.9 Live Score Ticker

- Inline flex, background: `--bg-card`
- LIVE badge: red dot (6px) + "LIVE" text in `--danger`, Mono 9px/600, uppercase
- Team code: Chakra Petch 13px/600, team color
- Score: JetBrains Mono 16px/600
- Overs: JetBrains Mono 11px, `--text-muted` in parentheses
- Vertical divider: 1px × 20px, `--border-medium`

### 5.10 Notification Bell

- Icon button (40×40, radius `md`)
- Unread count badge: 16×16px circle, background `--danger`, text white, Mono 9px/700, positioned top-right

### 5.11 Season Award Badges

- Radius: `full` (pill)
- Background: `--gold-soft`
- Border: `1px solid {gold}30`
- Emoji: 14px
- Label: Chakra Petch 11px/600, `--gold`

---

## 6. Page-by-Page Layout Guide

### 6.1 Landing Page (/)
- Full viewport hero with gradient background (`--bg-primary` → `--bg-deep`)
- App logo + "Bragg" wordmark (Chakra Petch 48-72px, gradient text cyan→gold)
- Tagline: "Predict. Compete. Bragg." (DM Sans 18px, `--text-secondary`)
- Two CTAs: "Create a Group" (primary gradient) + "Join with Code" (glass card)
- "How it works" section: 3 glass cards with step numbers in `--accent`
- Footer: disclaimer text in `--text-muted`

### 6.2 Login Page (/login)
- Centered glass card (max-width 400px)
- Display name input + email input
- "Send Magic Link" primary button
- Post-send state: envelope emoji + "Check your email" message

### 6.3 Dashboard (/dashboard)
- Header with app logo, notification bell, user avatar/name
- **Empty state:** hero "Create your first group" + invite code input
- **With groups:** grid/list of group cards showing name, member count, your role badge, latest match status
- "Create Group" primary button + "Join with Code" input

### 6.4 Group Home (/group/[id])
- Group name as H1, invite link copy button, admin badge if applicable
- Group switcher tab bar (if user is in multiple groups)
- **State 1 (next match):** countdown timer, match card, "Predict Now" CTA, season standings table
- **State 2 (live):** live score ticker, live leaderboard with all indicators, predictions locked badge
- **State 3 (no match):** last match recap card, season standings, next match preview

### 6.5 Prediction Page (/group/[id]/predict/[matchId])
- Match card header (teams, venue, deadline countdown)
- Quick Predict toggle (show only top 5 vs all 16+)
- Scenario cards in a vertical stack, grouped by resolution phase
- Each card: title, points badge, options as selectable buttons
- Bottom sticky bar: "Submit Predictions" primary button + "X/16 answered" counter
- Custom scenario section: "Propose a Scenario" card at bottom

### 6.6 Match Leaderboard (/group/[id]/match/[matchId])
- Live score ticker at top
- Group switcher (if in multiple groups)
- Leaderboard table: rank, name, per-scenario indicators (pills), match points
- Expandable row: click a user to see their full picks vs actual results
- Post-match: "Share Results" button that generates image card

### 6.7 Season Standings (/group/[id]/standings)
- Full-width table: rank, name, total points, matches predicted, points/match, accuracy %, role badge
- Current user row highlighted
- "Joined in Match X" badge for mid-season joiners
- Filter: all time vs last 10 matches

### 6.8 Admin Panel (/group/[id]/admin)
- Tabs: Members | Pending Approvals | Scenarios | Settings
- **Members:** list with role badges, promote/demote/remove actions
- **Pending:** approve/reject cards with user name + email
- **Scenarios:** list of custom scenarios pending approval, with approve/reject/adjust-points actions
- **Settings:** deadline override per match, group name edit

---

## 7. Animation & Motion

**Page transitions:** Use Next.js View Transitions (React 19.2) for smooth route changes.

**Leaderboard updates:** When points change via Realtime, the row should smoothly animate to its new position (rank shift). Use `transition: transform 0.3s ease` on leaderboard rows.

**Scenario resolution:** When a scenario resolves during a live match, the status pill should animate from ⏳ to ✅/❌ with a brief scale-up pulse (transform: scale(1.15) for 200ms).

**Score ticker:** Numbers should use a counter/odometer animation when updating (CSS counter or JS animation).

**Page load:** Stagger card reveals with `animation-delay` (50ms increments). Cards fade in + translate up by 10px.

**Interactions:** All interactive elements have `transition: all 0.15s ease` for hover/active states.

---

*This specification should be used alongside the interactive JSX design system preview and the PRD for full context.*
