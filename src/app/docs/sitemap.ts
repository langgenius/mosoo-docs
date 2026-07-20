import type { MetadataRoute } from 'next';
import { getDocsSitemapEntries } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return getDocsSitemapEntries();
}
