import { defineI18n } from 'fumadocs-core/i18n';

export const docsLanguages = ['en', 'zh-Hans', 'ja'] as const;

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: [...docsLanguages],
  hideLocale: 'default-locale',
  parser: 'dir',
  fallbackLanguage: null,
});

export type DocsLanguage = (typeof docsLanguages)[number];

export function isDocsLanguage(value: string): value is DocsLanguage {
  return docsLanguages.includes(value as DocsLanguage);
}

export function getDocsLanguage(slug?: string[]): DocsLanguage {
  const language = slug?.[0];
  return language && isDocsLanguage(language) ? language : 'en';
}

export function getLocalizedSlugs(slug?: string[]) {
  return getDocsLanguage(slug) === 'en' ? slug : slug?.slice(1);
}

export function getDocsLanguageFromPathname(pathname: string): DocsLanguage {
  const language = /^\/docs\/([^/]+)(?:\/|$)/.exec(pathname)?.[1];
  return language && isDocsLanguage(language) ? language : 'en';
}

export function getLocalizedDocsPath(
  pathname: string,
  language: DocsLanguage,
  availablePaths?: readonly string[],
) {
  const currentLanguage = getDocsLanguageFromPathname(pathname);
  const localeRoot = `/docs/${currentLanguage}`;
  const defaultPath = currentLanguage === 'en'
    ? pathname
    : pathname.replace(localeRoot, '/docs');
  const localizedPath = language === 'en'
    ? defaultPath
    : defaultPath.replace(/^\/docs(?=\/|$)/, `/docs/${language}`);

  if (availablePaths) {
    const normalizedPath = localizedPath.replace(/\/$/, '') || '/';
    const isAvailable = availablePaths.some(
      (path) => (path.replace(/\/$/, '') || '/') === normalizedPath,
    );
    if (!isAvailable) {
      return language === 'en' ? '/docs' : `/docs/${language}`;
    }
  }

  return localizedPath;
}
