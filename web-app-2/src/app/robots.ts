import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/join/*', '/privacy', '/terms'],
        disallow: ['/dashboard', '/group/*', '/profile', '/login', '/onboarding', '/accept-terms'],
      },
    ],
    sitemap: `${process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://bragg.app'}/sitemap.xml`,
  }
}
