# Design System Option 3: Electric Street

> Urban, bold, geometric. Matte dark backgrounds with high-contrast color blocks, chunky typography, and a street-culture energy that turns predictions into street cred.

---

## Design Philosophy

**Vibe:** Bold. Urban. In-your-face.
Electric Street takes inspiration from street art, sneaker culture, and sports graphics. Big chunky type. High-contrast color blocks. Sharp geometric shapes. The design is confident and loud — every screen feels like a poster you'd want to screenshot and share. The Bragg lime becomes a highlight marker, like spray paint on concrete.

**Best for:** Users who want the app to feel like a social flex — bold, share-worthy, and unapologetically loud.

---

## Color Palette

### Primary Colors (derived from logo)

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Primary | Bragg Lime | `#C8E64A` | 200, 230, 74 | Primary CTAs, highlights, wins |
| Primary Dark | Lime Shade | `#A8C42A` | 168, 196, 42 | Pressed states |
| Primary Surface | Lime Wash | `#C8E64A15` | — | Subtle backgrounds (8% opacity) |

### Secondary & Accent Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Secondary | Electric Coral | `#FF6B6B` | 255, 107, 107 | Losses, rivals, destructive |
| Accent | Vivid Blue | `#4F7DF9` | 79, 125, 249 | Links, info, secondary CTAs |
| Highlight | Sunburst Yellow | `#FFD93D` | 255, 217, 61 | Achievements, #1 rank, stars |
| Pop | Ultraviolet | `#8B5CF6` | 139, 92, 246 | Special badges, rare events |

### Neutral / Surface Colors

| Role | Name | Hex | RGB | Usage |
|------|------|-----|-----|-------|
| Background | Concrete Black | `#111111` | 17, 17, 17 | App background |
| Surface 1 | Dark Concrete | `#1A1A1A` | 26, 26, 26 | Cards |
| Surface 2 | Mid Concrete | `#242424` | 36, 36, 36 | Elevated cards, modals |
| Surface 3 | Light Concrete | `#2E2E2E` | 46, 46, 46 | Hover states |
| Border | Wire | `#333333` | 51, 51, 51 | Default borders |
| Border Active | Lime Wire | `#C8E64A50` | — | Active borders |

### Text Colors

| Role | Name | Hex | Contrast on Concrete Black | Usage |
|------|------|-----|---------------------------|-------|
| Text Primary | Pure White | `#FFFFFF` | 18.1:1 | Headings, bold content |
| Text Secondary | Warm Grey | `#A3A3A3` | 7.8:1 | Secondary text |
| Text Muted | Cool Grey | `#737373` | 4.8:1 | Captions |
| Text on Primary | Black | `#111111` | 14.5:1 on Lime | Text on lime |

### Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| Success | `#4ADE80` | Correct, wins |
| Warning | `#FFD93D` | Deadlines |
| Error | `#FF6B6B` | Errors, destructive |
| Info | `#4F7DF9` | Information |

---

## Typography

### Font Stack

| Role | Font | Weight Range | Fallback |
|------|------|-------------|----------|
| Display / Headings | **Space Grotesk** | 400–700 | system-ui, sans-serif |
| Body / UI | **DM Sans** | 400–700 | system-ui, sans-serif |
| Data / Numbers | **Space Grotesk** | 500–700 | system-ui, sans-serif |

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

### Type Scale

| Level | Size | Line Height | Weight | Font | Transform | Usage |
|-------|------|-------------|--------|------|-----------|-------|
| Display | 44px / 2.75rem | 1.05 | 700 | Space Grotesk | uppercase | Hero headlines |
| H1 | 34px / 2.125rem | 1.1 | 700 | Space Grotesk | uppercase | Page titles |
| H2 | 26px / 1.625rem | 1.15 | 700 | Space Grotesk | uppercase | Section titles |
| H3 | 20px / 1.25rem | 1.25 | 600 | Space Grotesk | — | Card titles |
| H4 | 17px / 1.0625rem | 1.35 | 600 | DM Sans | — | Subsections |
| Body Large | 18px / 1.125rem | 1.6 | 400 | DM Sans | — | Lead text |
| Body | 16px / 1rem | 1.6 | 400 | DM Sans | — | Default body |
| Body Small | 14px / 0.875rem | 1.5 | 400 | DM Sans | — | Secondary |
| Caption | 12px / 0.75rem | 1.4 | 500 | DM Sans | uppercase | Labels, timestamps |
| Stat | 28px / 1.75rem | 1.1 | 700 | Space Grotesk | — | Scores, big numbers |

**Signature move:** Headings are **bold + uppercase** with tight tracking (-0.02em). This creates the bold, poster-like feel that defines Electric Street.

---

## Spacing System

Based on 8px grid (bigger, bolder spacing):

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Micro spacing |
| `space-2` | 8px | Tight gaps |
| `space-3` | 12px | Compact padding |
| `space-4` | 16px | Standard padding |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Between components |
| `space-10` | 40px | Section inner |
| `space-12` | 48px | Between sections |
| `space-16` | 64px | Major separations |
| `space-20` | 80px | Hero areas |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Color blocks, stat cards, geometric elements |
| `radius-sm` | 4px | Tags, chips |
| `radius-md` | 8px | Buttons |
| `radius-lg` | 16px | Cards, main containers |
| `radius-xl` | 24px | Modals, feature cards |
| `radius-full` | 9999px | Avatars, dots |

**Signature:** Electric Street mixes **sharp (0px)** and **rounded (16px)** intentionally. Stat blocks and color chips are razor-sharp rectangles. Container cards are rounded. This contrast creates visual tension and energy.

---

## Shadows & Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| Elevation 0 | none | Flat elements |
| Elevation 1 | `0 2px 4px rgba(0,0,0,0.3)` | Cards |
| Elevation 2 | `0 4px 16px rgba(0,0,0,0.4)` | Hover, dropdowns |
| Elevation 3 | `0 8px 32px rgba(0,0,0,0.5)` | Modals |
| Color Block | `4px 4px 0 #C8E64A` | Featured elements (offset shadow) |
| Highlight | `0 0 0 3px #C8E64A` | Focus rings, selected state |

**Signature:** The **offset color shadow** (4px 4px) is a key design element. It creates a bold, graphic, poster-like effect for featured cards and stat blocks.

---

## Components

### Buttons

| Variant | Background | Text | Border | Hover | Active |
|---------|-----------|------|--------|-------|--------|
| Primary | `#C8E64A` | `#111111` | none | `#D4F05A` + offset shadow | translateY(2px), shadow shrink |
| Secondary | `#242424` | `#FFFFFF` | `2px solid #333333` | border `#C8E64A` | translateY(1px) |
| Ghost | transparent | `#A3A3A3` | none | text `#FFFFFF`, bg `#1A1A1A` | — |
| Destructive | `#FF6B6B` | `#111111` | none | `#FF5252` | translateY(2px) |
| Disabled | `#1A1A1A` | `#737373` | none | — | — |

- **Size:** Height 48px (slightly larger for boldness), padding 24px horizontal
- **Border Radius:** 8px
- **Font:** DM Sans 700, 14px, uppercase, letter-spacing 0.08em
- **Transition:** all 150ms ease-out
- **Signature hover:** Primary button gains a `4px 4px 0 #A8C42A` offset shadow on hover

### Cards

- **Background:** `#1A1A1A`
- **Border:** `1px solid #333333`
- **Border Radius:** 16px
- **Padding:** 24px
- **Hover:** Border `#C8E64A50`, slight translateY(-2px)

### Stat Block (unique component)

- **Background:** `#C8E64A` (or team color)
- **Border Radius:** 0px (sharp)
- **Text:** `#111111`, Space Grotesk 700
- **Size:** Compact, fits in a row of 2–3
- **Shadow:** `4px 4px 0 #A8C42A` (offset)
- **Usage:** Match score, points earned, predictions correct

### Inputs

- **Background:** `#1A1A1A`
- **Border:** `2px solid #333333` (thicker for boldness)
- **Border Radius:** 8px
- **Height:** 48px
- **Text:** `#FFFFFF`, DM Sans 400, 16px
- **Placeholder:** `#737373`
- **Focus:** Border `#C8E64A`, thick `3px` outline offset
- **Error:** Border `#FF6B6B`

### Badges / Tags

- **Color Block style:** Solid background (e.g., `#C8E64A` bg, `#111111` text)
- **Border Radius:** 4px
- **Padding:** 6px 12px
- **Font:** DM Sans 700, 11px, uppercase, letter-spacing 0.1em

### Leaderboard Row

- **Background:** `#1A1A1A`
- **Height:** 72px
- **Rank:** Space Grotesk 700, 24px
- **#1:** Yellow `#FFD93D` background block (sharp edges), black text — like a highlighted marker
- **#2:** `#A3A3A3` text
- **#3:** `#CD7F32` text
- **Score:** Space Grotesk 700, 20px, right-aligned
- **Your row:** Full lime left border (4px) + subtle lime wash background
- **Separator:** 2px solid `#242424`

### Navigation Bar

- **Background:** `#111111` solid (no blur — clean and sharp)
- **Height:** 56px
- **Border-bottom:** `2px solid #1A1A1A`
- **Active:** Lime text + bold underline (3px, sharp corners)
- **Icons:** 24px

### Share Card (unique component)

- **Purpose:** Screenshot-worthy result cards users share in group chats
- **Background:** Gradient from `#111111` to `#1A1A1A`
- **Border:** `3px solid #C8E64A`
- **Logo watermark:** Bottom-right, 20% opacity
- **Layout:** Big rank number, name, score, match context
- **Aspect ratio:** 1:1 (square, optimized for social sharing)

### Toast Notifications

- **Background:** `#242424`
- **Border:** `2px solid` (semantic color)
- **Border Radius:** 8px
- **Auto-dismiss:** 4 seconds

---

## Iconography

- **Style:** Solid/filled (not outlined — bolder feel)
- **Library:** Lucide Icons (solid variant) or Phosphor Icons (bold)
- **Sizes:** 16px (inline), 20px (buttons), 24px (nav), 48px (empty states)
- **Color:** White default, lime for active/highlighted

---

## Motion & Animation

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro-interaction | 120ms | ease-out | Button press |
| State transition | 180ms | ease-out | Hover, toggles |
| Content enter | 250ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Card pop-in (slight overshoot) |
| Content exit | 150ms | ease-in | Dismiss |
| Page transition | 250ms | ease-out | Slide left/right |
| Score pop | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Number change with scale overshoot |
| Rank change | 400ms | spring | Row reorder animation |

**Signature animations:**
- **Pop-in:** New elements enter with a slight scale overshoot (1.0 → 1.03 → 1.0) — energetic, not smooth
- **Offset shadow hover:** Shadow grows/shrinks on hover (4px → 6px → back to 0px on press)
- **Stat counter:** Numbers flip/scale when updating, using the overshoot easing

**Reduced motion:** All animations collapse to 150ms opacity transitions.

---

## Grid & Layout

- **Max content width:** 480px (mobile), 720px (tablet)
- **Page padding:** 16px (mobile), 32px (tablet+)
- **Card grid:** Single column, with stat blocks in 2–3 column rows
- **Visual rhythm:** Alternate between full-width sections and tight 2-col stat grids
- **Bottom safe area:** 34px

---

## Design Patterns

### Color Blocking
Electric Street uses **solid color blocks** as a design device:
- Rank #1 gets a yellow block behind their rank number
- Correct predictions get a lime block
- Key stats sit in colored rectangles with sharp corners
- This creates a bold, graphic, infographic-like feel

### Contrast Mixing
Intentionally mix **sharp (0px radius)** and **round (16px radius)** elements:
- Data/stats: Sharp rectangles
- Containers/cards: Rounded
- Buttons: Medium (8px)
This tension creates visual energy.

---

## Dark Mode

Electric Street is **dark-only**. The matte, concrete-like dark surfaces are essential to the urban aesthetic. Color blocks need the dark background to pop. The palette is warmer and more neutral (pure greys) compared to the blue-tinted darks of Stadium Lights.
