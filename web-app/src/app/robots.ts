import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

/**
 * robots.txt — tells search crawlers which paths are indexable.
 *
 * Only the public marketing surfaces (`/`, `/login`, `/privacy`,
 * `/terms`, `/join/*`) are allowed. Every authenticated surface is
 * explicitly disallowed so crawlers do not attempt to index user
 * data or bump our RLS-protected endpoints.
 *
 * @see docs/stories/PERF-002-web-vitals-seo.md
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/group',
        '/profile',
        '/settings',
        '/onboarding',
        '/accept-terms',
        '/auth',
      ],
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
