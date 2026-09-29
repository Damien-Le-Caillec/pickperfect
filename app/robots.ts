import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal/'],
      // Pages privées, liens d'invitation et API : pas d'indexation
      disallow: [
        '/api/', '/admin', '/dashboard', '/lists', '/l/', '/join/', '/groups',
        '/profile', '/points', '/friends', '/birthdays', '/reservations',
        '/shared-lists', '/reset-password/', '/unsubscribe', '/explore',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
