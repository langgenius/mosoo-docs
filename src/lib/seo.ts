import { source } from './source';
import {
  buildSitemapEntries,
  getLanguageAlternates,
  toCanonicalDocsUrl,
} from './seo-core';

export {
  buildDocsStructuredData,
  getDocumentLanguage,
  getOpenGraphAlternateLocale,
  toCanonicalDocsUrl,
} from './seo-core';

type Page = (typeof source)['$inferPage'];

function getPagePaths() {
  return new Set(source.getPages().map((page) => page.url));
}

export function getDocsLanguageAlternates(page: Page) {
  return getLanguageAlternates(page.url, getPagePaths());
}

export function getDocsSitemapEntries() {
  return buildSitemapEntries(source.getPages());
}
