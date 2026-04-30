import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:13000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Public pages — let crawlers in.
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/settings'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
