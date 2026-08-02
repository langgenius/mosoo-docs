import { getPageUrl, source } from './source';
import {
  buildSitemapEntries,
  getLanguageAlternates,
  toCanonicalDocsUrl,
} from './seo-core';

export {
  buildDocsStructuredData,
  getDocumentLanguage,
  getOpenGraphLocale,
  getOpenGraphAlternateLocale,
  toCanonicalDocsUrl,
} from './seo-core';

type Page = (typeof source)['$inferPage'];

function getPagePaths() {
  return new Set(source.getPages().map(getPageUrl));
}

export function getDocsLanguageAlternates(page: Page) {
  return getLanguageAlternates(getPageUrl(page), getPagePaths());
}

export function getDocsSitemapEntries() {
  return buildSitemapEntries(source.getPages().map((page) => ({ url: getPageUrl(page) })));
}
