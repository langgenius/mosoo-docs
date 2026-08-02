import { docsLanguages, isDocsLanguage, type DocsLanguage } from './i18n';

const siteUrl = 'https://mosoo.ai';
const docsRoot = '/docs';
const openGraphLocales: Record<DocsLanguage, string> = {
  en: 'en_US',
  'zh-Hans': 'zh_CN',
  ja: 'ja_JP',
};
const docsRootNames: Record<DocsLanguage, string> = {
  en: 'mosoo Docs',
  'zh-Hans': 'mosoo 中文文档',
  ja: 'mosoo 日本語ドキュメント',
};

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
  for (const language of docsLanguages) {
    if (language === 'en') continue;
    const localizedRoot = `${docsRoot}/${language}`;
    if (path === localizedRoot) return docsRoot;
    if (path.startsWith(`${localizedRoot}/`)) {
      return path.replace(localizedRoot, docsRoot);
    }
  }

  return path;
}

function toLanguagePath(pathname: string, language: DocsLanguage) {
  const englishPath = toEnglishPath(pathname);
  if (language === 'en') return englishPath;
  return englishPath === docsRoot
    ? `${docsRoot}/${language}`
    : englishPath.replace(`${docsRoot}/`, `${docsRoot}/${language}/`);
}

export function toCanonicalDocsUrl(pathname: string) {
  const path = normalizePathname(pathname);
  return new URL(`${path}/`, siteUrl).toString();
}

export function getDocumentLanguage(pathname: string) {
  const path = normalizePathname(pathname);
  const language = docsLanguages.find((candidate) => {
    if (candidate === 'en') return false;
    const localizedRoot = `${docsRoot}/${candidate}`;
    return path === localizedRoot || path.startsWith(`${localizedRoot}/`);
  });
  return language ?? 'en';
}

export function getOpenGraphLocale(language: string) {
  return openGraphLocales[isDocsLanguage(language) ? language : 'en'];
}

export function getOpenGraphAlternateLocale(language: string, hasTranslation: boolean) {
  if (!hasTranslation) return undefined;
  const currentLanguage = isDocsLanguage(language) ? language : 'en';
  return docsLanguages
    .filter((candidate) => candidate !== currentLanguage)
    .map((candidate) => openGraphLocales[candidate]);
}

export function getLanguageAlternates(pathname: string, pagePaths: ReadonlySet<string>) {
  const availablePaths = new Set([...pagePaths].map(normalizePathname));
  const entries = docsLanguages.flatMap((language) => {
    const path = toLanguagePath(pathname, language);
    return availablePaths.has(path)
      ? [[language, toCanonicalDocsUrl(path)] as const]
      : [];
  });
  const english = entries.find(([language]) => language === 'en')?.[1];
  if (!english || entries.length !== docsLanguages.length) return undefined;

  return Object.fromEntries([...entries, ['x-default', english]]);
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
  const localizedRoot = toLanguagePath(docsRoot, language);
  const rootUrl = toCanonicalDocsUrl(localizedRoot);
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: docsRootNames[language],
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
