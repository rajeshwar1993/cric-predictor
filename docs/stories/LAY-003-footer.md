# LAY-003: Global Footer

**Phase:** 3 — Layout Shell
**Dependencies:** LAY-001
**Estimated scope:** Static footer component with disclaimer and legal links

---

## Description

Implement the global footer shown on all pages except standalone pages (Login, Onboarding, Accept Terms, 404, Error). Contains disclaimer text and links to Privacy Policy and Terms & Conditions.

---

## Acceptance Criteria

- [ ] Disclaimer text: "Bragg is a free prediction game for entertainment purposes only. No real money. No betting. No prizes."
- [ ] Link to Privacy Policy (`/privacy`)
- [ ] Link to Terms & Conditions (`/terms`)
- [ ] Text: Caption style (DM Sans 500, 12px, uppercase, `#737373`)
- [ ] Links: `#A3A3A3`, hover `#C8E64A`
- [ ] Centered, max-width matches PageWrapper
- [ ] Top border: `1px solid #242424`
- [ ] Padding: 24px vertical
- [ ] Server Component (no interactivity)

---

## Files to Create

```
web-app/src/components/layout/
├── footer.tsx
├── footer.stories.tsx
```

---

## Technical Notes

### Implementation
```tsx
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-mid-concrete mt-12">
      <div className="mx-auto max-w-[720px] px-4 md:px-8 py-6 text-center">
        <p className="text-xs text-text-muted mb-2">
          Bragg is a free prediction game for entertainment purposes only. No real money. No betting. No prizes.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
          <Link href="/privacy" className="hover:text-bragg-lime transition-colors">
            Privacy Policy
          </Link>
          <span className="text-text-muted">·</span>
          <Link href="/terms" className="hover:text-bragg-lime transition-colors">
            Terms & Conditions
          </Link>
        </div>
      </div>
    </footer>
  )
}
```

### Pages That Show Footer
All pages **except**: `/login`, `/onboarding`, `/accept-terms`, `not-found`, `error`

The footer is NOT included in the root layout. Instead, each page layout or page that needs it explicitly includes `<Footer />`. Alternatively, create an `(app)` route group layout that includes NavBar + Footer for all authenticated pages.

### Recommended Route Group Structure
```
src/app/
├── layout.tsx              # Root (fonts, providers, Toaster)
├── (public)/               # No nav bar, no footer
│   ├── page.tsx            # Landing
│   ├── login/page.tsx
│   ├── join/[code]/page.tsx
│   └── auth/callback/route.ts
├── (standalone)/           # No nav bar, no footer
│   ├── onboarding/page.tsx
│   ├── accept-terms/page.tsx
│   └── not-found.tsx
├── (app)/                  # Has nav bar + footer
│   ├── layout.tsx          # NavBar at top, Footer at bottom
│   ├── dashboard/page.tsx
│   ├── group/[groupId]/...
│   ├── profile/page.tsx
│   ├── privacy/page.tsx
│   └── terms/page.tsx
```

This route group pattern is strongly recommended — it cleanly separates layouts without conditional rendering.

---

## Storybook Requirements

### Footer Stories
- `Default` — standard footer
- `InContext` — footer at bottom of a page with content above
