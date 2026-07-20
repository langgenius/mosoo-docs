import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { getDocsLanguageAlternates, toCanonicalDocsUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: toCanonicalDocsUrl(page.url),
    alternates: {
      languages: getDocsLanguageAlternates(page),
    },
  }));
}
