# PUB-002: Privacy + Terms Pages

**Phase:** 14 — Public Pages
**Dependencies:** LAY-003
**Estimated scope:** Static content pages for privacy policy and terms & conditions

---

## Description

Build the privacy policy (`/privacy`) and terms & conditions (`/terms`) static content pages. These are referenced throughout the app (footer, onboarding, accept-terms, landing page).

---

## Acceptance Criteria

### Privacy Policy Page (`/privacy`)
- [ ] Route: `/privacy` (inside `(app)` layout for authenticated users, also accessible without auth)
- [ ] Page title: "PRIVACY POLICY"
- [ ] Static content with headings, paragraphs
- [ ] Placeholder privacy policy text (to be replaced with real legal content)
- [ ] Properly formatted with H2/H3 headings, body text
- [ ] Footer at bottom

### Terms & Conditions Page (`/terms`)
- [ ] Route: `/terms`
- [ ] Page title: "TERMS & CONDITIONS"
- [ ] Static content with headings, paragraphs
- [ ] Placeholder terms text
- [ ] Footer at bottom

### Shared Behavior
- [ ] Both pages are pure content (no per-user data, no data fetching, no `force-dynamic`). Note: routes ship as `ƒ Dynamic` because the shared `(app)` layout's NavBar reads cookies — that is intentional and shared with every other `(app)` page.
- [ ] Prose-style typography: Body text in DM Sans 400, headings in Space Grotesk
- [ ] Max-width constrained by PageWrapper
- [ ] Links open in new tab from onboarding/accept-terms forms

---

## Files to Create

```
web-app/src/app/(app)/
├── privacy/
│   └── page.tsx
├── terms/
│   └── page.tsx
```

---

## Technical Notes

### Content Structure
Use standard markdown-like sections:
1. Introduction
2. Data Collection
3. How We Use Your Data
4. Data Sharing
5. Data Retention
6. Your Rights
7. Contact

For now, use placeholder text that's structurally correct. Real legal content will replace it later.

### Styling
Apply prose-like styling:
```tsx
<div className="prose prose-invert max-w-none">
  <h1>Privacy Policy</h1>
  <p>Last updated: March 2026</p>
  {/* ... */}
</div>
```

Consider installing `@tailwindcss/typography` for prose styles, or manually style the content.

---

## Storybook Requirements

Not needed for static content pages. Verify visually in browser.
