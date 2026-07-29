import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh-Hans'],
  hideLocale: 'default-locale',
  parser: 'dir',
  fallbackLanguage: null,
});

export type DocsLanguage = (typeof i18n.languages)[number];

export function getDocsLanguage(slug?: string[]): DocsLanguage {
  return slug?.[0] === 'zh-Hans' ? 'zh-Hans' : 'en';
}

export function getLocalizedSlugs(slug?: string[]) {
  return getDocsLanguage(slug) === 'zh-Hans' ? slug?.slice(1) : slug;
}

export function getDocsLanguageFromPathname(pathname: string): DocsLanguage {
  return /^\/docs\/zh-Hans(?:\/|$)/.test(pathname) ? 'zh-Hans' : 'en';
}

export function getLocalizedDocsPath(
  pathname: string,
  language: DocsLanguage,
  availablePaths?: readonly string[],
) {
  const defaultPath = pathname.replace(/^\/docs\/zh-Hans(?=\/|$)/, '/docs');
  const localizedPath = language === 'zh-Hans'
    ? defaultPath.replace(/^\/docs(?=\/|$)/, '/docs/zh-Hans')
    : defaultPath;

  if (availablePaths) {
    const normalizedPath = localizedPath.replace(/\/$/, '') || '/';
    const isAvailable = availablePaths.some(
      (path) => (path.replace(/\/$/, '') || '/') === normalizedPath,
    );
    if (!isAvailable) {
      return language === 'zh-Hans' ? '/docs/zh-Hans' : '/docs';
    }
  }

  return localizedPath;
}
