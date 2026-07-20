const siteUrl = 'https://mosoo.ai';
const docsRoot = '/docs';
const zhPrefix = 'zh-Hans';

interface SitemapPage {
  url: string;
}

interface StructuredDataInput {
  title: string;
  description: string;
  pathname: string;
}

function normalizePathname(pathname: string) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return path.replace(/\/+$/, '') || '/';
}

function toEnglishPath(pathname: string) {
  const path = normalizePathname(pathname);
  return path === `${docsRoot}/${zhPrefix}`
    ? docsRoot
    : path.replace(`${docsRoot}/${zhPrefix}/`, `${docsRoot}/`);
}

function toChinesePath(pathname: string) {
  const englishPath = toEnglishPath(pathname);
  return englishPath === docsRoot
    ? `${docsRoot}/${zhPrefix}`
    : englishPath.replace(`${docsRoot}/`, `${docsRoot}/${zhPrefix}/`);
}

export function toCanonicalDocsUrl(pathname: string) {
  const path = normalizePathname(pathname);
  return new URL(`${path}/`, siteUrl).toString();
}

export function getDocumentLanguage(pathname: string) {
  const path = normalizePathname(pathname);
  return path === `${docsRoot}/${zhPrefix}` || path.startsWith(`${docsRoot}/${zhPrefix}/`)
    ? zhPrefix
    : 'en';
}

export function getOpenGraphAlternateLocale(language: string, hasTranslation: boolean) {
  if (!hasTranslation) return undefined;
  return language === zhPrefix ? ['en_US'] : ['zh_CN'];
}

export function getLanguageAlternates(pathname: string, pagePaths: ReadonlySet<string>) {
  const availablePaths = new Set([...pagePaths].map(normalizePathname));
  const enPath = toEnglishPath(pathname);
  const zhPath = toChinesePath(pathname);
  if (!availablePaths.has(enPath) || !availablePaths.has(zhPath)) return undefined;

  const en = toCanonicalDocsUrl(enPath);
  const zh = toCanonicalDocsUrl(zhPath);
  return {
    en,
    'zh-Hans': zh,
    'x-default': en,
  };
}

export function buildSitemapEntries(pages: SitemapPage[]) {
  const pagePaths = new Set(pages.map((page) => normalizePathname(page.url)));

  return pages
    .map((page) => {
      const languages = getLanguageAlternates(page.url, pagePaths);
      return {
        url: toCanonicalDocsUrl(page.url),
        ...(languages ? { alternates: { languages } } : {}),
      };
    })
    .sort((left, right) => left.url.localeCompare(right.url));
}

export function buildDocsStructuredData({ title, description, pathname }: StructuredDataInput) {
  const url = toCanonicalDocsUrl(pathname);
  const language = getDocumentLanguage(pathname);
  const localizedRoot = language === zhPrefix ? `${docsRoot}/${zhPrefix}` : docsRoot;
  const rootUrl = toCanonicalDocsUrl(localizedRoot);
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: language === zhPrefix ? 'mosoo 中文文档' : 'mosoo Docs',
      item: rootUrl,
    },
  ];

  if (url !== rootUrl) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: title,
      item: url,
    });
  } else {
    breadcrumbItems[0].name = title;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${url}#article`,
    url,
    headline: title,
    description,
    inLanguage: language,
    mainEntityOfPage: url,
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://mosoo.ai/docs/#website',
      name: 'mosoo Docs',
      url: 'https://mosoo.ai/docs/',
    },
    author: { '@id': 'https://mosoo.ai/#organization' },
    publisher: { '@id': 'https://mosoo.ai/#organization' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    },
  };
}
