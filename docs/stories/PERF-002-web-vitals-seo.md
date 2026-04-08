# PERF-002: Web Vitals + SEO + Open Graph

**Phase:** 15 — Analytics & Polish
**Dependencies:** LAY-001, PUB-001
**Estimated scope:** Web Vitals reporting, SEO meta tags, Open Graph for social sharing

---

## Description

Implement Web Vitals reporting to PostHog, SEO metadata for all pages, and Open Graph tags for social sharing on public pages (landing, join invite).

---

## Acceptance Criteria

### Web Vitals (`src/components/analytics/web-vitals-reporter.tsx`)
- [ ] Reports LCP, INP, CLS to PostHog
- [ ] Uses `web-vitals` library or Next.js built-in `reportWebVitals`
- [ ] Fires `web_vitals` event with metric name, value, and page path
- [ ] Only runs in production
- [ ] Performance targets: LCP < 2.5s, INP < 200ms, CLS < 0.1

### SEO Metadata
- [ ] Root metadata (layout.tsx): title template, description, icons
- [ ] Per-page titles:
  - Landing: "Bragg — Predict Right. Prove It."
  - Login: "Login | Bragg"
  - Dashboard: "Dashboard | Bragg"
  - Gang page: "{gangName} | Bragg"
  - Predict page: "Predict — {match} | Bragg"
  - Match leaderboard: "Leaderboard — {match} | Bragg"
  - Season standings: "Standings — {gangName} | Bragg"
  - Profile: "Profile | Bragg"
  - Settings: "Settings — {gangName} | Bragg"
- [ ] `robots.txt` and `sitemap.xml` via Next.js conventions

### Open Graph (public pages)
- [ ] Landing page:
  - `og:title`: "Bragg — Predict Right. Prove It."
  - `og:description`: "The prediction game that settles debates in your group chat."
  - `og:image`: Bragg logo/branding image
  - `og:type`: "website"
- [ ] Join page (`/join/[code]`):
  - `og:title`: "Join {gangName} on Bragg"
  - `og:description`: "You've been invited to join {gangName}. Make predictions, compete on leaderboards."
  - Dynamic metadata via `generateMetadata()`

### Font Optimization
- [ ] Space Grotesk and DM Sans preloaded via `next/font` (done in FND-003)
- [ ] `font-display: swap` for both fonts
- [ ] `tabular-nums` on all numeric content to prevent CLS

### Image Optimization
- [ ] Team logos served via `next/image` with proper sizing
- [ ] Bragg logo in public/ directory
- [ ] Favicon and app icons configured

---

## Files to Create/Modify

```
web-app/src/
├── components/
│   └── analytics/
│       └── web-vitals-reporter.tsx
├── app/
│   ├── layout.tsx                  # UPDATE — metadata
│   ├── robots.ts                   # robots.txt
│   ├── sitemap.ts                  # sitemap.xml
│   └── icon.svg                    # Favicon
web-app/public/
├── og-image.png                    # Open Graph image (1200x630)
├── logo.svg                        # App logo
```

---

## Technical Notes

### Web Vitals Reporter
```tsx
'use client'
import { useReportWebVitals } from 'next/web-vitals'
import { trackEvent } from '@/lib/analytics/client'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    trackEvent('web_vitals', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      page: window.location.pathname,
    })
  })
  return null
}
```

Add to root layout: `<WebVitalsReporter />`

### Metadata Template
```tsx
// layout.tsx
export const metadata: Metadata = {
  title: { default: 'Bragg', template: '%s | Bragg' },
  description: 'Predict right. Prove it. Bragg. A social prediction game for cricket.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  openGraph: {
    type: 'website',
    siteName: 'Bragg',
    locale: 'en_US',
  },
}
```

### Per-Page Dynamic Metadata
```tsx
// group/[groupId]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const gang = await getGangDetails(params.groupId)
  return { title: gang?.name ?? 'Gang' }
}
```

### robots.ts
```tsx
import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/group', '/profile'] },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
```

### Dependencies
```bash
npm install web-vitals  # if not using Next.js built-in
```

---

## Testing Requirements

- [ ] Verify Open Graph tags render correctly (use og:image debugger tools)
- [ ] Verify Web Vitals fire in PostHog (check in PostHog events dashboard)
- [ ] Verify robots.txt and sitemap.xml render
- [ ] Lighthouse audit: aim for 90+ on Performance, Accessibility, SEO
