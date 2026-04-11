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
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_APP_URL
  const now = new Date()

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
