import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

/**
 * sitemap.xml — public routes we want search engines to index.
 *
 * Only surfaces that can be reached without authentication are
 * included. Authenticated routes live behind `robots.ts`'s disallow
 * list; adding them here would fight the crawler directives and
 * leak route names into public indexes.
 *
 * Per-route `/join/[code]` links are intentionally omitted — they are
 * one-off invite URLs and should not appear in search results.
 *
 * @see docs/stories/PERF-002-web-vitals-seo.md
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

/**
 * Hard-coded last-modified date for every static surface.
 *
 * `new Date()` would bump on every build, which churns the sitemap and
 * trains crawlers to ignore our `lastmod` hints. Instead we track this as
 * a constant — bump it explicitly when the actual content of one of these
 * pages changes (privacy/terms text, login copy, landing hero, etc.).
 *
 * Last touched: 2026-04-11 (Phase 14 — privacy/terms refresh).
 */
const LAST_MODIFIED = new Date('2026-04-11T00:00:00.000Z')

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL

  return [
    {
      url: `${baseUrl}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
