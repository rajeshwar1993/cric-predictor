# Bragg Design System — Stadium Kinetic

The visual language of stadium floodlights cutting through the night sky. Dark-only. Tonal layering over hard borders. Built for a young, competitive audience.

**Source of truth:** `web-app/src/app/globals.css`
**Component library:** shadcn/ui (Base UI React primitives) in `web-app/src/components/ui/`
**Icons:** Lucide React

---

## Colors

### Surfaces (layered field depth)

Surfaces create depth through background color alone — no borders. Each layer is progressively lighter.

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-deep` | `#0b0e14` | Page background, body |
| `--bg-primary` | `#101319` | Slightly elevated sections |
| `--bg-card` | `#171c28` | Cards, containers |
| `--bg-elevated` | `#252b3d` | Popovers, dropdowns, modals |
| `--bg-hover` | `#2e3550` | Hover states on surfaces |
| `--bg-input` | `#0e1119` | Input field backgrounds |

### Text (no pure white)

All text has a slight cool tint. Never use `#ffffff`.

| Token | Hex | Contrast on `--bg-deep` | Use |
|-------|-----|------------------------|-----|
| `--text-primary` | `#ecedf6` | ~14:1 | Headings, bold labels, primary content |
| `--text-secondary` | `#9ba1b5` | ~6.7:1 | Body text, descriptions, secondary info |
| `--text-muted` | `#7c8599` | ~5.8:1 | Labels, hints, auxiliary text, timestamps |
| `--text-inverse` | `#0b0e14` | — | Text on light/accent backgrounds |

All three levels pass WCAG AA (4.5:1) on `--bg-deep`. When placing text on `--bg-card` or `--bg-elevated`, prefer `--text-primary` or `--text-secondary`.

### Accent — Lime "Ammunition"

The primary accent. Used for interactive elements, highlights, and CTAs.

| Token | Hex | Use |
|-------|-----|-----|
| `--cyan` | `#f3ffca` | Text accents, icon tints, active states |
| `--cyan-soft` | `#f3ffca15` | Soft backgrounds (15% opacity) |
| `--cyan-medium` | `#f3ffca25` | Medium backgrounds (25% opacity) |
| `--cta-from` | `#cafd00` | CTA gradient start (brighter lime) |
| `--cta-to` | `#beee00` | CTA gradient end |

### Tertiary — Orange "Pulse"

Secondary accent for warnings, urgency, and variety.

| Token | Hex | Use |
|-------|-----|-----|
| `--tertiary` | `#ff7948` | Warning indicators, secondary highlights |
| `--tertiary-soft` | `#ff794815` | Soft orange backgrounds |

### Semantic

| Token | Hex | Use |
|-------|-----|-----|
| `--success` | `#34D399` | Correct predictions, positive states |
| `--danger` | `#F87171` | Errors, incorrect, destructive actions |
| `--warning` | `#ff7948` | Warnings, deadlines approaching |
| `--pending` | `#64748B` | Unresolved, waiting states |

### IPL Team Colors

Used for team badges, match headers, and team-specific accents. Available as `--color-team-{code}` in Tailwind.

| Team | Token | Hex |
|------|-------|-----|
| CSK | `--color-team-csk` | `#F9CD05` |
| MI | `--color-team-mi` | `#004BA0` |
| RCB | `--color-team-rcb` | `#EC1C24` |
| KKR | `--color-team-kkr` | `#3B215D` |
| DC | `--color-team-dc` | `#004C93` |
| SRH | `--color-team-srh` | `#F26522` |
| RR | `--color-team-rr` | `#EA1A85` |
| PBKS | `--color-team-pbks` | `#ED1B24` |
| GT | `--color-team-gt` | `#1C1C2B` |
| LSG | `--color-team-lsg` | `#A72056` |

---

## Typography

### Font Stack

| Role | Font | Variable | Weights | Use |
|------|------|----------|---------|-----|
| Display / Headings | **Sora** | `--font-heading` | 400–800 | Headings, CTA labels, brand text |
| Body / UI | **Outfit** | `--font-sans` | 300–700 | Body text, form labels, descriptions |
| Stats / Data | **JetBrains Mono** | `--font-mono` | 400–700 | Points, ranks, countdowns, scenario labels |

### Utility Classes

| Class | Effect |
|-------|--------|
| `.font-display` | Heading font + `letter-spacing: -0.02em` |
| `.font-body` | Body font |
| `.font-stats` | Mono font (scoreboard/data feel) |

### Heading Defaults

All `<h1>`–`<h6>` elements automatically use the heading font with `-0.02em` tracking. No class needed — just use the semantic tag.

### Guidelines

- Use `font-display` for CTA button labels, section titles, and any text that needs brand weight.
- Use `font-stats` for points (`15 pts`), rankings (`#1`), countdowns, and any numerical data.
- Body text (the default) handles everything else.
- For large display text (hero headings), add `tracking-tighter` for extra impact.
- Prefer `font-semibold` (600) or `font-bold` (700) for headings. Use `font-extrabold` (800) only for hero/display sizes.

---

## Border Radius

Radius is controlled by a single global token. **Never hardcode pixel values — always use Tailwind's `rounded-*` classes.**

```css
--radius: 0.375rem;  /* 6px base — change this one value to adjust everything */
```

### Scale

| Class | Formula | Current value |
|-------|---------|---------------|
| `rounded-sm` | `--radius * 0.6` | 3.6px |
| `rounded-md` | `--radius * 0.8` | 4.8px |
| `rounded-lg` | `--radius` (base) | 6px |
| `rounded-xl` | `--radius * 1.4` | 8.4px |
| `rounded-2xl` | `--radius * 1.8` | 10.8px |
| `rounded-3xl` | `--radius * 2.2` | 13.2px |
| `rounded-full` | `9999px` | Circles/pills |

### When to Use What

| Element | Class |
|---------|-------|
| Pills, tags, small badges | `rounded-lg` |
| Buttons, inputs, icon badges | `rounded-xl` |
| Cards, containers, modals | `rounded-2xl` |
| Avatars, team dots | `rounded-full` |

---

## Borders

Stadium Kinetic avoids visible borders. Surfaces are separated by **tonal layering** (background color differences), not outlines.

| Token | Value | Use |
|-------|-------|-----|
| `--border-subtle` | `transparent` | Default — no visible border |
| `--border-light` | `transparent` | Same |
| `--border-medium` | `#9ba1b530` | Subtle dividers when tonal contrast isn't enough |
| `--border-focus` | `#f3ffca4D` | Focus rings and keyboard nav indicators |
| `--ghost-border` | `#9ba1b526` | Very faint structural outlines (card edges, dividers) |

When you need a visible separator, use `border-[var(--ghost-border)]` — a 15% opacity line that suggests structure without drawing attention.

---

## Utility Classes

### Gradients

| Class | Effect | Use |
|-------|--------|-----|
| `.text-gradient` | Lime-to-cyan text gradient | Hero headings, emphasis text |
| `.cta-gradient` | Solid lime gradient background | Primary CTA buttons |
| `.bg-card-gradient` | Card-to-elevated gradient | Elevated card surfaces |

### Effects

| Class | Effect | Use |
|-------|--------|-----|
| `.glass` | `bg-elevated` + `blur(24px)` | Glassmorphism overlays |
| `.ghost-focus` | 1px ghost-border outline, lime on focus | Form field wrappers |
| `.btn-glow` | Animated lime glow + pulse | Primary CTA buttons |
| `.grain` | Noise texture via `::after` pseudo | Atmospheric section backgrounds |

---

## Animations

### Keyframes

| Name | Effect | Use |
|------|--------|-----|
| `fade-in-up` | Fade in + slide up 20px | Page entrance, staggered reveals |
| `fade-in` | Simple opacity fade | Subtle entrances |
| `pulse-glow` | Pulsing lime box-shadow | CTA button glow |

### Classes

| Class | Duration | Use |
|-------|----------|-----|
| `.animate-fade-in-up` | 0.7s ease-out | Content blocks entering view |
| `.animate-fade-in` | 0.7s ease-out | Subtle element reveals |
| `.btn-glow` | 3s infinite | Primary CTA buttons |

### Staggering

Use inline `style={{ animationDelay: '150ms' }}` to stagger sequential elements. Increment by 150ms per element for a natural cascade.

```tsx
<h1 className="animate-fade-in-up">Title</h1>
<p className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>Subtitle</p>
<div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>CTAs</div>
```

---

## Components

### Button (`src/components/ui/button.tsx`)

Built on Base UI React. Six variants, six sizes.

| Variant | Use |
|---------|-----|
| `default` | Primary actions (lime bg, dark text) |
| `outline` | Secondary actions with border |
| `secondary` | Low-emphasis actions (elevated bg) |
| `ghost` | Minimal/inline actions (no bg until hover) |
| `destructive` | Delete, remove, danger actions (red tint) |
| `link` | Inline text links |

For **primary CTAs** (e.g., "Start Your Squad"), use a custom `Link` with `cta-gradient` + `btn-glow` + `font-display` rather than the Button component — this gives the full branded treatment.

### Card (`src/components/ui/card.tsx`)

Subcomponents: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`. Uses `rounded-xl`, `ring-1 ring-foreground/10` by default.

### Input (`src/components/ui/input.tsx`)

Built on Base UI. Uses `rounded-lg`, transparent border, focus ring with `--ring` color.

---

## Page Structure

### Section Pattern

Each page section follows this pattern:

```tsx
<section className="relative mx-auto w-full max-w-5xl px-4 py-24 sm:px-6">
  {/* Optional section label */}
  <p className="font-stats text-xs font-medium uppercase tracking-[0.2em] text-[var(--cta-from)]">
    Section Label
  </p>
  <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
    Section Heading
  </h2>

  {/* Content */}
</section>
```

- Max width: `max-w-5xl` (1024px) for content sections
- Vertical padding: `py-24` between sections
- Section labels: `font-stats`, uppercase, `tracking-[0.2em]`, lime color
- Section headings: `font-display`, `text-3xl`/`sm:text-4xl`, `font-bold`

### Component Organization

Break pages into focused components under `src/components/{feature}/`. Keep page files thin — imports and composition only.

```
src/components/home/
  hero-section.tsx
  how-it-works.tsx
  prediction-preview.tsx

src/app/page.tsx  ← just imports and composes
```

---

## Background Treatments

### Stadium Floodlights

Large, blurred radial gradients positioned off-screen to suggest ambient light:

```tsx
<div className="pointer-events-none absolute inset-0" aria-hidden="true">
  <div className="absolute -left-[15%] -top-[20%] h-[60vh] w-[50vw] rounded-full bg-[var(--cta-from)]/[0.06] blur-[120px]" />
</div>
```

- Use `--cta-from` at 4–6% opacity
- Optionally add `--tertiary` at 3% for warm variation
- Always `pointer-events-none` and `aria-hidden="true"`

### Diagonal Energy Lines

Thin gradient lines rotated a few degrees for dynamism:

```tsx
<div className="absolute left-0 top-[38%] h-px w-full -rotate-[4deg] bg-gradient-to-r from-transparent via-[var(--cta-from)]/15 to-transparent" />
```

### Grain Texture

Apply `grain` class to a positioned container for atmosphere:

```tsx
<div className="grain pointer-events-none absolute inset-0" aria-hidden="true" />
```

Use sparingly — hero sections and full-page backgrounds only.

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use CSS variables for all colors | Hardcode hex values in components |
| Use `rounded-*` Tailwind classes | Hardcode `rounded-[12px]` pixel values |
| Separate surfaces by background tone | Add visible borders between sections |
| Use `font-display` for headings/CTAs | Use heading font via raw `font-family` |
| Use `font-stats` for numerical data | Use body font for points/rankings |
| Keep text colors within the three tiers | Use `#ffffff` or `opacity-50` hacks |
| Stagger animations with `animationDelay` | Add `transition-delay` classes |
| Break pages into component files | Write entire pages in a single file |
| Change `--radius` to adjust all radii | Override radius per-component |
