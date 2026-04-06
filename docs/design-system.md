# Bragg — Design System

> The visual and interaction language for Bragg. Every screen, component, and interaction should reference this document. If a decision isn't covered here, ask before improvising.

---

## 1. Brand Identity

### Personality

Bragg is **confident, competitive, and a little cheeky**. The app celebrates winners, serves banter, and treats users as adults who live for cricket. It is not corporate, not sterile, and not apologetic.

| Attribute      | Bragg is...                        | Bragg is NOT...                  |
| -------------- | ---------------------------------- | -------------------------------- |
| Tone           | Direct, punchy, energetic          | Polished, formal, cautious       |
| Visual feel    | Bold, dark, high-contrast          | Pastel, soft, airy               |
| Data display   | Satisfying, prominent, competitive | Hidden, minimal, understated     |
| Interactions   | Fast, snappy, rewarding            | Slow, heavy, over-animated       |
| Personality    | Cheeky banter, bragging rights     | Neutral, corporate, gamified     |

### Logo

- **File:** `docs/logo.png`
- **Form:** A bold "B" in chartreuse/lime with a shattered-glass explosive effect
- **Usage rules:**
  - Always use on dark backgrounds — never on light or colored backgrounds
  - Maintain clear space equal to the height of the "B" letter's counter (the enclosed space) on all sides
  - Never stretch, rotate, recolor, or add effects to the logo
  - Minimum display size: 32px height
  - For favicon/small contexts, use the logo as-is (the shattered "B" reads well at small sizes)

### App Name

- **Spelled:** Bragg (capital B, double-g)
- **Never:** BRAGG, bragg, Brag
- **In UI text:** Use "Bragg" as a proper noun. Never use "the Bragg app" — just "Bragg"

---

## 2. Color System

### Design Philosophy

Dark mode by default. The app lives in the dark — matches happen in the evening, users are on their phones, and the brand energy pops hardest against deep backgrounds. Light mode is **not supported** in V1.

The primary brand color is derived from the logo's chartreuse/lime green. It is electric, confident, and impossible to ignore — just like a correct prediction.

### Core Palette

#### Brand Colors

| Token                | Hex         | Usage                                            |
| -------------------- | ----------- | ------------------------------------------------ |
| `--brand`            | `#D4F34A`   | Logo color, primary CTAs, active states, key highlights |
| `--brand-hover`      | `#E0F76E`   | Hover/pressed state for brand elements           |
| `--brand-muted`      | `#D4F34A26` | Brand at 15% opacity — subtle tints, backgrounds |
| `--brand-on`         | `#0A0A0F`   | Text/icons on brand-colored backgrounds          |

#### Surfaces (Background Layers)

| Token                | Hex         | Usage                                            |
| -------------------- | ----------- | ------------------------------------------------ |
| `--bg-base`          | `#0A0A0F`   | App background, deepest layer                    |
| `--bg-raised`        | `#141418`   | Cards, panels, elevated content                  |
| `--bg-overlay`       | `#1C1C22`   | Modals, drawers, dropdowns, hover states on cards |
| `--bg-inset`         | `#08080C`   | Inset areas, input fields, wells                 |

#### Text

| Token                | Hex         | Usage                                            |
| -------------------- | ----------- | ------------------------------------------------ |
| `--text-primary`     | `#F0F0F5`   | Headings, primary content, important data        |
| `--text-secondary`   | `#9898A6`   | Supporting text, labels, descriptions            |
| `--text-tertiary`    | `#5A5A6E`   | Disabled text, placeholders, hints               |
| `--text-inverse`     | `#0A0A0F`   | Text on brand/light backgrounds                  |

#### Borders & Dividers

| Token                | Hex              | Usage                                       |
| -------------------- | ---------------- | ------------------------------------------- |
| `--border-default`   | `#FFFFFF0F`      | White at 6% — subtle card/section borders   |
| `--border-strong`    | `#FFFFFF1A`      | White at 10% — emphasized borders, dividers |
| `--border-focus`     | `#D4F34A`        | Focus rings (brand color)                   |

#### Semantic Colors

| Token                | Hex         | Usage                                            |
| -------------------- | ----------- | ------------------------------------------------ |
| `--success`          | `#22C55E`   | Correct predictions, positive outcomes           |
| `--success-muted`    | `#22C55E1A` | Success backgrounds (10% opacity)                |
| `--error`            | `#EF4444`   | Errors, destructive actions, wrong predictions   |
| `--error-muted`      | `#EF44441A` | Error backgrounds (10% opacity)                  |
| `--warning`          | `#F59E0B`   | Deadlines approaching, caution states            |
| `--warning-muted`    | `#F59E0B1A` | Warning backgrounds (10% opacity)                |
| `--info`             | `#3B82F6`   | Informational states, links, neutral highlights  |
| `--info-muted`       | `#3B82F61A` | Info backgrounds (10% opacity)                   |

#### Match & Competition

| Token                   | Hex         | Usage                                        |
| ----------------------- | ----------- | -------------------------------------------- |
| `--live`                | `#EF4444`   | Live match indicators, pulsing dot           |
| `--rank-gold`           | `#FFD700`   | 1st place                                    |
| `--rank-silver`         | `#C0C0C0`   | 2nd place                                    |
| `--rank-bronze`         | `#CD7F32`   | 3rd place                                    |
| `--prediction-locked`   | `#5A5A6E`   | Locked/past-deadline predictions             |
| `--prediction-correct`  | `#22C55E`   | Correct prediction cell                      |
| `--prediction-incorrect`| `#EF4444`   | Incorrect prediction cell                    |
| `--prediction-pending`  | `#F59E0B`   | Unresolved prediction cell                   |

### Contrast Requirements

All text must meet **WCAG AA** minimum contrast ratios:

| Combination                         | Ratio  | Status |
| ----------------------------------- | ------ | ------ |
| `--text-primary` on `--bg-base`     | 17.4:1 | AAA    |
| `--text-primary` on `--bg-raised`   | 14.2:1 | AAA    |
| `--text-secondary` on `--bg-base`   | 6.8:1  | AA     |
| `--text-secondary` on `--bg-raised` | 5.5:1  | AA     |
| `--brand` on `--bg-base`            | 12.8:1 | AAA    |
| `--brand-on` on `--brand`           | 12.8:1 | AAA    |
| `--text-tertiary` on `--bg-base`    | 3.2:1  | AA (large text only) |

> **Rule:** Never use `--text-tertiary` for body-sized text. It is only for disabled states and decorative labels at >=18px.

---

## 3. Typography

### Font Pairing

| Role      | Font            | Weights          | Usage                                              |
| --------- | --------------- | ---------------- | -------------------------------------------------- |
| **Heading** | Space Grotesk | 500, 600, 700    | Page titles, section headings, leaderboard names   |
| **Body**    | Inter         | 400, 500, 600    | Body text, labels, descriptions, form inputs       |
| **Data**    | Inter         | 500, 600, 700 (tabular figures) | Scores, points, ranks, stats, countdowns |

**Why this pairing:** Space Grotesk has bold personality and distinctive character shapes that match Bragg's confident tone — without drifting into "gamer font" territory. Inter is the most readable sans-serif available, with excellent tabular figures for the data-heavy leaderboard screens.

### Loading

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
```

- Use `font-display: swap` to prevent invisible text during load
- Preload only the heading font (Space Grotesk) — Inter is commonly cached

### Type Scale

Based on a 16px base with a 1.250 ratio (Major Third). All sizes in `rem`.

| Token        | Size    | px  | Weight | Line Height | Letter Spacing | Usage                              |
| ------------ | ------- | --- | ------ | ----------- | -------------- | ---------------------------------- |
| `--text-xs`  | 0.75rem | 12  | 500    | 1.5         | 0.02em         | Badges, overlines, fine print      |
| `--text-sm`  | 0.875rem| 14  | 400    | 1.5         | 0.01em         | Helper text, secondary labels      |
| `--text-base`| 1rem    | 16  | 400    | 1.6         | 0              | Body text, form inputs, descriptions |
| `--text-lg`  | 1.125rem| 18  | 500    | 1.5         | -0.01em        | Card titles, emphasized text       |
| `--text-xl`  | 1.25rem | 20  | 600    | 1.4         | -0.01em        | Section headings                   |
| `--text-2xl` | 1.5rem  | 24  | 600    | 1.3         | -0.02em        | Page sub-headings                  |
| `--text-3xl` | 2rem    | 32  | 700    | 1.2         | -0.02em        | Page titles                        |
| `--text-4xl` | 2.5rem  | 40  | 700    | 1.1         | -0.03em        | Hero headlines, big numbers        |
| `--text-5xl` | 3rem    | 48  | 700    | 1.0         | -0.03em        | Landing page hero only             |

### Typography Rules

- **Headings (Space Grotesk):** Use for `h1`–`h4` and any text that needs to feel bold and branded. Never use below `--text-lg`.
- **Body (Inter):** Use for everything else — paragraphs, labels, buttons, inputs, table cells.
- **Data/Numbers (Inter tabular):** Use `font-variant-numeric: tabular-nums` for all numeric data in tables, leaderboards, scores, and stats. This prevents layout shift when numbers update.
- **Line length:** Cap at 65 characters for body text (`max-width: 65ch`).
- **No text below 12px** — ever. Even for fine print.
- **Uppercase:** Use sparingly — only for overlines, badges, and status labels. Always add `letter-spacing: 0.05em` when using uppercase.

---

## 4. Spacing & Layout

### Spacing Scale

4px base unit. Use only these values for all padding, margins, and gaps.

| Token    | Value | Usage                                              |
| -------- | ----- | -------------------------------------------------- |
| `--sp-1` | 4px   | Tight inner padding, icon-to-text gap              |
| `--sp-2` | 8px   | Default gap between inline elements                |
| `--sp-3` | 12px  | Card inner padding (compact), input padding        |
| `--sp-4` | 16px  | Standard card padding, section gap (mobile)        |
| `--sp-5` | 20px  | Content area horizontal padding (mobile)           |
| `--sp-6` | 24px  | Section spacing, card padding (comfortable)        |
| `--sp-8` | 32px  | Page section gaps                                  |
| `--sp-10`| 40px  | Major section separators                           |
| `--sp-12`| 48px  | Page top/bottom padding                            |
| `--sp-16`| 64px  | Hero section vertical padding                      |

### Layout

- **Mobile-first:** All designs start at 375px and scale up
- **Max content width:** 480px (this is a mobile-first app — even on desktop, content stays phone-width for consistency)
- **Horizontal padding:** `--sp-5` (20px) on mobile
- **Page structure:** Vertical scroll only. No horizontal scrolling ever.

### Breakpoints

| Name     | Width   | Behavior                                    |
| -------- | ------- | ------------------------------------------- |
| `mobile` | < 480px | Default. Full-width content, 20px gutters   |
| `tablet` | 480px+  | Content centered, max-width 480px           |
| `desktop`| 768px+  | Same as tablet — this is a mobile-first app |

> **Note:** Bragg is a mobile-first app used on phones during cricket matches. Desktop simply centers the mobile layout. No separate desktop layout is needed for V1.

### Border Radius

| Token            | Value | Usage                                      |
| ---------------- | ----- | ------------------------------------------ |
| `--radius-sm`    | 6px   | Badges, chips, small elements              |
| `--radius-md`    | 10px  | Buttons, inputs, small cards               |
| `--radius-lg`    | 14px  | Cards, panels, modals                      |
| `--radius-xl`    | 20px  | Bottom sheets, large modals                |
| `--radius-full`  | 9999px| Avatars, pills, circular buttons           |

---

## 5. Components

### Buttons

#### Primary (Brand CTA)

```
Background:  --brand (#D4F34A)
Text:        --brand-on (#0A0A0F)
Font:        Inter 600, --text-base
Padding:     12px 24px
Radius:      --radius-md (10px)
Min height:  48px (touch target)
Hover:       --brand-hover (#E0F76E)
Active:      scale(0.97), brightness(0.9)
Disabled:    opacity 0.4, no pointer events
Loading:     spinner replaces text, button stays same width
```

#### Secondary (Outline)

```
Background:  transparent
Border:      1px solid --border-strong
Text:        --text-primary
Hover:       background --bg-overlay
Active:      scale(0.97)
```

#### Destructive

```
Background:  --error (#EF4444)
Text:        #FFFFFF
Hover:       brightness(1.1)
```

#### Ghost

```
Background:  transparent
Text:        --text-secondary
Hover:       background --bg-overlay, text --text-primary
```

#### Button Rules

- Always use `cursor: pointer`
- Minimum touch target: 48px height
- Never put two primary buttons next to each other
- Loading state: disable + show spinner, never show a second CTA
- Destructive buttons are always visually separated from primary actions

### Cards

The primary container for content throughout the app — gang cards, match cards, scenario cards, leaderboard rows.

```
Background:  --bg-raised (#141418)
Border:      1px solid --border-default
Radius:      --radius-lg (14px)
Padding:     --sp-4 (16px)
```

- Cards do **not** have drop shadows (flat on dark backgrounds)
- Hover state (if interactive): border color transitions to `--border-strong`
- Active/selected state: border color transitions to `--brand`, subtle brand-muted background
- Cards stack vertically with `--sp-3` (12px) gap between them

### Inputs

```
Background:  --bg-inset (#08080C)
Border:      1px solid --border-default
Radius:      --radius-md (10px)
Padding:     12px 16px
Font:        Inter 400, --text-base
Text:        --text-primary
Placeholder: --text-tertiary
Min height:  48px

Focus:       border --border-focus (brand), ring 2px --brand-muted
Error:       border --error, helper text in --error below field
Disabled:    opacity 0.4
```

- Always pair with a visible `<label>` above the input
- Error messages appear directly below the field, not at the top of the form
- Use semantic input types (`email`, `tel`, `number`) for correct mobile keyboards

### Avatars

User initials displayed in a circle.

```
Size:        36px (default), 28px (compact/leaderboard), 44px (profile)
Background:  --bg-overlay (#1C1C22)
Text:        --text-primary, Inter 600
Radius:      --radius-full
Border:      1px solid --border-default
```

- Display first character of display name, uppercased
- In leaderboards, avatars sit inline with rank and name

### Badges & Chips

```
Padding:     4px 8px
Font:        Inter 500, --text-xs, uppercase, letter-spacing 0.05em
Radius:      --radius-sm (6px)
```

| Variant       | Background         | Text             | Usage                |
| ------------- | ------------------ | ---------------- | -------------------- |
| Brand         | `--brand-muted`    | `--brand`        | Points, stats        |
| Success       | `--success-muted`  | `--success`      | Correct, resolved    |
| Error         | `--error-muted`    | `--error`        | Wrong, failed        |
| Warning       | `--warning-muted`  | `--warning`      | Deadline, pending    |
| Neutral       | `--bg-overlay`     | `--text-secondary`| Default, info       |
| Live          | `--error-muted`    | `--live`         | Live match indicator |

### Navigation Bar (Global)

```
Position:    fixed top
Background:  --bg-base with backdrop-blur(12px) at 80% opacity
Height:      56px
Padding:     0 --sp-5
Border:      bottom 1px solid --border-default
Z-index:     50
```

- Logo (left), notification bell (right), user avatar (right)
- Notification badge: `--error` background, white text, --radius-full, min-width 18px
- Content area gets `padding-top: 56px` to account for fixed nav

### Side Panels (Notifications & User Menu)

```
Width:       min(320px, 85vw)
Background:  --bg-raised
Border:      left or right 1px solid --border-default
Overlay:     --bg-base at 60% opacity (scrim)
Animation:   slide in from edge, 250ms ease-out
Z-index:     60
```

- Notifications panel: slides from right
- User menu panel: slides from left
- Tapping the scrim dismisses the panel

### Footer

```
Padding:     --sp-6 --sp-5
Border:      top 1px solid --border-default
Text:        --text-tertiary, --text-sm
```

- Disclaimer text, Privacy Policy link, T&C link
- Links use `--text-secondary` with underline on hover

### Toasts / Feedback

```
Position:    fixed bottom center, 20px from bottom
Background:  --bg-overlay
Border:      1px solid --border-strong
Radius:      --radius-md
Padding:     12px 16px
Font:        Inter 500, --text-sm
Shadow:      0 4px 12px rgba(0, 0, 0, 0.4)
Animation:   slide up + fade in, 200ms ease-out
Auto-dismiss: 4 seconds
```

| Variant  | Left accent border color |
| -------- | ----------------------- |
| Success  | `--success`             |
| Error    | `--error`               |
| Warning  | `--warning`             |
| Info     | `--info`                |

### Confirmation Dialogs (Destructive Actions)

```
Overlay:     --bg-base at 70% opacity
Container:   --bg-raised, --radius-lg, max-width 400px, centered
Padding:     --sp-6
```

- Warning icon (triangle) in `--warning`
- Clear explanation of consequences
- Type-to-confirm input field
- Cancel button (ghost) + Confirm button (destructive)
- Confirm button disabled until input matches required text

### Skeleton Loaders

```
Background:  --bg-raised
Shimmer:     linear-gradient sweep, --bg-overlay to --bg-raised
Animation:   1.5s ease-in-out infinite
Radius:      match the element being loaded (--radius-lg for cards, --radius-full for avatars)
```

- Use skeletons for any content that takes >300ms to load
- Match the approximate shape and size of the real content
- Never show empty white space while loading

---

## 6. Effects & Motion

### Animation Principles

- **Fast and snappy** — this is a competitive app, not a meditation tool
- **Purposeful** — every animation communicates a state change or spatial relationship
- **Interruptible** — user input always takes priority over in-progress animation
- **Reduced motion** — respect `prefers-reduced-motion`: disable all non-essential animations, keep only opacity transitions

### Timing

| Action               | Duration | Easing              | Usage                          |
| -------------------- | -------- | ------------------- | ------------------------------ |
| Button press         | 100ms    | ease-out            | scale(0.97) feedback           |
| Hover transitions    | 150ms    | ease-out            | Color/border/bg changes        |
| Panel slide          | 250ms    | ease-out            | Side panels, drawers           |
| Modal appear         | 200ms    | ease-out            | Scale(0.95→1) + fade in        |
| Modal dismiss        | 150ms    | ease-in             | Fade out (faster than enter)   |
| Toast appear         | 200ms    | ease-out            | Slide up + fade in             |
| Page transition      | 200ms    | ease-out            | Opacity crossfade              |
| Score update         | 300ms    | ease-out            | Number tick-up animation       |
| Skeleton shimmer     | 1500ms   | ease-in-out         | Infinite loop                  |

### Key Animations

#### Live Pulse

For the live match indicator dot:

```css
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
/* Duration: 1.5s, infinite */
```

#### Score Counter

When points or scores update, numbers should tick up/down to the new value over 300ms rather than snapping. This makes data feel alive and satisfying.

#### Leaderboard Rank Shift

When a user's rank changes on the live leaderboard, the row should animate to its new position (translate Y) over 300ms with `ease-out`. Other rows shift to accommodate.

### What NOT to Animate

- Page-level layout changes (just render)
- Form validation errors (just appear)
- Data table sorting (just reorder)
- Navigation between pages (simple crossfade only)

---

## 7. Iconography

### Icon System

- **Library:** Lucide Icons (consistent stroke width, open source, React-friendly)
- **Style:** Outline (stroke), 1.5px stroke width
- **Never:** Use emojis as functional icons. Emojis are only allowed in user-generated content or celebratory moments (e.g., "You're #1! 🏆" in a toast — even then, use the icon version alongside).

### Sizes

| Token      | Size | Stroke | Usage                          |
| ---------- | ---- | ------ | ------------------------------ |
| `--icon-sm`| 16px | 1.5px  | Inline with small text, badges |
| `--icon-md`| 20px | 1.5px  | Buttons, inputs, list items    |
| `--icon-lg`| 24px | 2px    | Navigation, headers, actions   |
| `--icon-xl`| 32px | 2px    | Empty states, feature icons    |

### Common Icons

| Concept            | Icon (Lucide name)     |
| ------------------ | ---------------------- |
| Notifications      | `bell`                 |
| User/Profile       | `user`                 |
| Settings           | `settings`             |
| Back/Navigate      | `chevron-left`         |
| Forward/Navigate   | `chevron-right`        |
| Share              | `share-2`              |
| Copy               | `copy`                 |
| Link/Invite        | `link`                 |
| Check/Correct      | `check`                |
| X/Wrong            | `x`                    |
| Lock/Locked        | `lock`                 |
| Clock/Deadline     | `clock`                |
| Trophy/Rank        | `trophy`               |
| Users/Members      | `users`                |
| Plus/Create        | `plus`                 |
| Trash/Delete       | `trash-2`              |
| Log out            | `log-out`              |
| Warning            | `alert-triangle`       |
| Info               | `info`                 |
| Live/Radio         | `radio`                |
| Cricket (custom)   | Use a custom SVG or 🏏 only as decoration |

---

## 8. Data Display

Leaderboards, stats, and scores are the heart of Bragg. They must feel **satisfying, readable, and competitive**.

### Leaderboard Rows

```
Height:      56px minimum
Padding:     --sp-3 --sp-4
Background:  --bg-raised
Border:      bottom 1px solid --border-default
```

| Element         | Style                                                 |
| --------------- | ----------------------------------------------------- |
| Rank number     | Inter 700, --text-lg, fixed width 32px, right-aligned |
| Rank medal (1-3)| Replace number with gold/silver/bronze icon or color  |
| Avatar          | 28px, --radius-full, --sp-3 gap from rank             |
| Display name    | Inter 500, --text-base, truncate with ellipsis        |
| Points          | Inter 700, --text-lg, --brand color, right-aligned    |
| Current user    | Row background: `--brand-muted`, left border 3px `--brand` |

- Use `font-variant-numeric: tabular-nums` on all numeric columns
- Rank 1–3 get `--rank-gold`, `--rank-silver`, `--rank-bronze` text color on the rank number
- Rows must be tappable (if they lead to a detail view)

### Stats Cards

For profile stats and match summaries.

```
Background:  --bg-raised
Radius:      --radius-lg
Padding:     --sp-4
```

| Element    | Style                                                 |
| ---------- | ----------------------------------------------------- |
| Value      | Space Grotesk 700, --text-3xl (32px), --text-primary  |
| Label      | Inter 500, --text-sm, --text-secondary, uppercase     |

- Arrange in 2-column grid on mobile, with `--sp-3` gap
- Use tabular figures for values
- Animate value changes (counter tick-up)

### Match Cards

```
Background:  --bg-raised
Radius:      --radius-lg
Padding:     --sp-4
```

- Team names in Inter 600, `--text-base`
- Match number / date in `--text-secondary`, `--text-sm`
- Venue in `--text-tertiary`, `--text-sm`
- Live badge: pulsing red dot + "LIVE" text in `--live` color
- Prediction deadline: `--warning` color with clock icon when <2 hours remain

### Prediction Reveal Table

A matrix showing all members' predictions per scenario.

```
Cell size:       minimum 44px height (touch target)
Header:          --bg-overlay, Inter 600, --text-sm, sticky top
Row borders:     1px solid --border-default
Cell text:       Inter 400, --text-sm
```

| Cell State   | Background           | Text Color     |
| ------------ | -------------------- | -------------- |
| Correct      | `--success-muted`    | `--success`    |
| Incorrect    | `--error-muted`      | `--error`      |
| Pending      | transparent          | `--text-secondary` |
| Not predicted| transparent          | `--text-tertiary`  |

- Horizontal scroll allowed for this table only (when members exceed viewport width)
- Current user's column: `--brand-muted` background strip
- Scenario names in first column: sticky left, `--bg-raised` background

### Score Display (Live Match)

```
Team score:   Space Grotesk 700, --text-4xl (40px)
Overs:        Inter 500, --text-lg, --text-secondary
Run rate:     Inter 500, --text-base, --text-secondary
Batsman name: Inter 500, --text-base
Batsman score: Inter 700, --text-lg
On-strike:    --brand dot indicator (6px circle)
```

- Stale data indicator (>1 min old): `--warning` badge with "Last updated X ago"
- Last 6 balls: individual pills showing run value, styled by type:
  - Dot ball: `--bg-overlay`, `--text-tertiary`
  - Runs (1-3): `--bg-overlay`, `--text-primary`
  - Boundary (4): `--info-muted` bg, `--info` text
  - Six: `--brand-muted` bg, `--brand` text
  - Wicket: `--error-muted` bg, `--error` text, "W"
  - Wide/No-ball: `--warning-muted` bg, `--warning` text

---

## 9. Patterns & Page Templates

### Empty States

Every screen with dynamic content must handle the empty state gracefully.

```
Icon:         --icon-xl (32px), --text-tertiary
Headline:     Space Grotesk 600, --text-xl, --text-primary
Description:  Inter 400, --text-base, --text-secondary, max 45ch
CTA:          Primary button (if actionable)
Alignment:    Center, vertically centered in available space
```

- Tone: encouraging, not scolding. "No gangs yet" not "You haven't joined any gangs"
- Always provide a next action when possible

### Sticky Submit Bar (Predict Page)

```
Position:    fixed bottom
Background:  --bg-base with backdrop-blur(12px) at 90% opacity
Padding:     --sp-3 --sp-5
Border:      top 1px solid --border-default
Z-index:     40
```

- Progress counter: "X/19 picked" in `--text-secondary`
- Submit button: Primary (brand) button, full width below counter
- Safe area padding at bottom for devices with gesture bars

### Gang Cards (Dashboard)

```
Background:  --bg-raised
Radius:      --radius-lg
Padding:     --sp-4
Min height:  80px
```

- Gang name: Inter 600, `--text-lg`
- Member count: `--text-secondary` with users icon
- Admin badge: brand-variant chip for admin, hidden for members
- Entire card is tappable → gang page
- Hover: `--border-strong` border

---

## 10. Accessibility

### Touch Targets

- **Minimum:** 44px x 44px for all interactive elements
- **Spacing:** Minimum 8px gap between adjacent touch targets
- If the visual element is smaller than 44px (e.g., a 24px icon button), extend the hit area with padding

### Focus States

- All interactive elements must show a visible focus ring on keyboard navigation
- Focus ring: 2px solid `--border-focus` (brand color), 2px offset
- Never remove focus outlines — style them, don't hide them

### Screen Readers

- All interactive elements need descriptive `aria-label` text
- Images need meaningful `alt` text (or `alt=""` for decorative)
- Form fields must have associated `<label>` elements
- Live-updating content (scores, leaderboards) uses `aria-live="polite"`
- Status badges include text, not just color (e.g., "Correct" not just green)

### Color Independence

- Never convey information through color alone
- Correct/incorrect predictions: pair color with icon (checkmark/x)
- Rank positions: pair medal color with rank number
- Live status: pair red dot with "LIVE" text label

### Motion

- Respect `prefers-reduced-motion`:
  - Disable: pulse animations, score counter ticks, rank shift slides, skeleton shimmer
  - Keep: opacity transitions (fade in/out), instant state changes
- No auto-playing animations that can't be paused

---

## 11. Copy & Voice Guidelines

### Tone

- **Direct** — say what you mean in as few words as possible
- **Confident** — no hedging, no "Oops!", no "Sorry!"
- **Competitive** — celebrate winners, acknowledge losses without sugar-coating
- **Casual** — contractions, short sentences, how you'd text a friend

### Do / Don't

| Do                                    | Don't                                |
| ------------------------------------- | ------------------------------------ |
| "You're in!"                          | "You have successfully joined."      |
| "Predictions locked"                  | "The prediction window has closed."  |
| "3 of 19 picked"                      | "You have completed 3 out of 19."   |
| "Match starts in 2h"                  | "The match is scheduled to begin..." |
| "Wrong call."                         | "Unfortunately, your prediction..." |
| "Dead last."                          | "You are currently in the last..."  |
| "Nailed it."                          | "Great job! Your prediction was..."  |

### Button Labels

- Primary actions: verb-first ("Create gang", "Join gang", "Submit predictions", "Copy invite link")
- Destructive actions: be explicit ("Delete gang", "Leave gang", "Remove member")
- Cancel: just "Cancel" — never "No, go back" or "Nevermind"

### Error Messages

- State the problem + what to do: "Display name taken in this gang. Pick a different one."
- Never blame the user: "Something went wrong" not "You entered an invalid..."
- Never use technical jargon: "Couldn't save" not "Server returned 500"

---

## 12. Quick Reference — CSS Custom Properties

```css
:root {
  /* Brand */
  --brand: #D4F34A;
  --brand-hover: #E0F76E;
  --brand-muted: #D4F34A26;
  --brand-on: #0A0A0F;

  /* Surfaces */
  --bg-base: #0A0A0F;
  --bg-raised: #141418;
  --bg-overlay: #1C1C22;
  --bg-inset: #08080C;

  /* Text */
  --text-primary: #F0F0F5;
  --text-secondary: #9898A6;
  --text-tertiary: #5A5A6E;
  --text-inverse: #0A0A0F;

  /* Borders */
  --border-default: rgba(255, 255, 255, 0.06);
  --border-strong: rgba(255, 255, 255, 0.10);
  --border-focus: #D4F34A;

  /* Semantic */
  --success: #22C55E;
  --success-muted: rgba(34, 197, 94, 0.10);
  --error: #EF4444;
  --error-muted: rgba(239, 68, 68, 0.10);
  --warning: #F59E0B;
  --warning-muted: rgba(245, 158, 11, 0.10);
  --info: #3B82F6;
  --info-muted: rgba(59, 130, 246, 0.10);

  /* Match */
  --live: #EF4444;
  --rank-gold: #FFD700;
  --rank-silver: #C0C0C0;
  --rank-bronze: #CD7F32;
  --prediction-correct: #22C55E;
  --prediction-incorrect: #EF4444;
  --prediction-pending: #F59E0B;

  /* Typography */
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;

  /* Spacing */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-10: 40px;
  --sp-12: 48px;
  --sp-16: 64px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}
```
