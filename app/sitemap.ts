import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Seules les pages publiques sont listées (le reste nécessite un compte)
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '',                        priority: 1   },
    { path: '/register',               priority: 0.8 },
    { path: '/login',                  priority: 0.5 },
    { path: '/legal/cgu',              priority: 0.2 },
    { path: '/legal/privacy',          priority: 0.2 },
    { path: '/legal/mentions-legales', priority: 0.2 },
  ]
  return pages.map(p => ({
    url:          `${BASE_URL}${p.path}`,
    lastModified: new Date(),
    priority:     p.priority,
  }))
}
