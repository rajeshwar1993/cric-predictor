# PUB-001: Landing Page

**Phase:** 14 — Public Pages
**Dependencies:** LAY-001, DSN-001, DSN-002
**Estimated scope:** Marketing landing page with hero, how-it-works, prediction preview, CTAs

---

## Description

Build the public landing page (`/`) — the first thing unauthenticated users see. Authenticated users are redirected to the dashboard. The page sells the concept of Bragg with bold Electric Street styling.

---

## Acceptance Criteria

### Landing Page (`src/app/(public)/page.tsx`)
- [ ] Public route (no auth required)
- [ ] Authenticated users redirected to `/dashboard`
- [ ] Statically generated (no user-specific data)
- [ ] Mobile-first, scrollable single page

### Hero Section
- [ ] App logo prominent
- [ ] Headline: "PREDICT RIGHT. PROVE IT. BRAGG." (Display style, 44px, uppercase)
- [ ] Subheadline: "The prediction game that settles debates in your group chat." (Body Large)
- [ ] Two CTAs:
  - "Create a Gang" (primary button) → `/login?redirectTo=/dashboard`
  - "Join a Gang" (secondary button) → `/login?redirectTo=/dashboard`
- [ ] Bold, graphic feel — color blocks, geometric accents

### How It Works Section
- [ ] Section title: "HOW IT WORKS" (H2)
- [ ] Three steps with numbered lime stat blocks:
  1. "Form a Gang" — "Create a private group, share the invite link, get your crew in."
  2. "Make Predictions" — "19 scenarios per match. Pick winners, top scorers, powerplay runs, and more."
  3. "Compete & Bragg" — "Live leaderboards. Season standings. Screenshot your #1 spot."

### Prediction Preview Section
- [ ] Section title: "WHAT YOU'LL PREDICT"
- [ ] Mock match card showing sample prediction scenarios:
  - "Who wins the toss?" (team_pick, 5 pts)
  - "Who wins the match?" (team_pick, 10 pts)
  - "Top run scorer?" (player_pick, 15 pts)
  - "CSK innings score?" (range, 10 pts)
  - "Will anyone score 50+?" (yes_no, 5 pts)
- [ ] Shows point values and input types
- [ ] Uses real component styling (ScenarioCard-like)
- [ ] Mock data only — no real API calls

### CTA Section (bottom)
- [ ] "Ready to prove your cricket brain?" headline
- [ ] Repeated create/join CTAs
- [ ] Disclaimer text

### Footer
- [ ] Global footer with disclaimer, privacy, terms links

---

## Files to Create

```
web-app/src/app/(public)/
├── page.tsx

web-app/src/components/
└── landing/
    ├── hero-section.tsx
    ├── how-it-works.tsx
    ├── prediction-preview.tsx
    └── cta-section.tsx
```

---

## Technical Notes

### Auth Redirect
```tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (/* landing page content */)
}
```

### Static Generation
The landing page content is static. Since it checks auth state, it will be dynamically rendered per-request, but the content itself doesn't change. Consider `export const dynamic = 'force-dynamic'` since auth check requires cookies.

### Design Philosophy
This page should feel like a poster — bold, loud, screenshot-worthy. Use:
- Large uppercase headings with tight tracking
- Lime color blocks and offset shadows
- Sharp-edged stat blocks mixed with rounded cards
- High contrast against Concrete Black background

### Gambling Disclaimer
Per PRD NFR: "Bragg is a free prediction game for entertainment purposes only. No real money. No betting. No prizes." — visible on landing page.

---

## Storybook Requirements

### Landing Page Stories
Since this is a full page, create stories for individual sections:
- `HeroSection` — hero with CTAs
- `HowItWorks` — 3-step explainer
- `PredictionPreview` — mock prediction scenarios
- `CTASection` — bottom CTA
