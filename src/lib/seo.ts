import { source } from './source';

const siteOrigin = 'https://mosoo.ai';
const zhPrefix = '/docs/zh-Hans';
const pageUrls = new Set(source.getPages().map((page) => page.url));

function withTrailingSlash(path: string) {
  return path.endsWith('/') ? path : `${path}/`;
}

export function getAbsoluteUrl(path: string) {
  return new URL(withTrailingSlash(path), siteOrigin).href;
}

function toZhPath(path: string) {
  return path === '/docs' ? zhPrefix : path.replace(/^\/docs(?=\/|$)/, zhPrefix);
}

function toEnPath(path: string) {
  return path === zhPrefix ? '/docs' : path.replace(/^\/docs\/zh-Hans(?=\/|$)/, '/docs');
}

export function getLanguageAlternates(path: string) {
  const isZh = path === zhPrefix || path.startsWith(`${zhPrefix}/`);
  const en = isZh ? toEnPath(path) : path;
  const zh = isZh ? path : toZhPath(path);
  const languages: Record<string, string> = {};

  if (pageUrls.has(en)) languages.en = getAbsoluteUrl(en);
  if (pageUrls.has(zh)) languages['zh-CN'] = getAbsoluteUrl(zh);
  if (languages.en) languages['x-default'] = languages.en;

  return languages;
}

export function getSitemapEntries() {
  return source
    .getPages()
    .map((page) => ({
      url: getAbsoluteUrl(page.url),
      alternates: getLanguageAlternates(page.url),
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
}
