import { source } from './source';

const siteUrl = 'https://mosoo.ai';
const zhPrefix = 'zh-Hans';

type Page = (typeof source)['$inferPage'];

export function toCanonicalDocsUrl(pathname: string) {
  const path = pathname.replace(/\/$/, '');
  return new URL(`${path}/`, siteUrl).toString();
}

export function getDocsLanguageAlternates(page: Page) {
  const isChinese = page.slugs[0] === zhPrefix;
  const enPage = isChinese ? source.getPage(page.slugs.slice(1)) : page;
  const zhPage = isChinese ? page : source.getPage([zhPrefix, ...page.slugs]);

  if (!enPage || !zhPage) return undefined;

  const en = toCanonicalDocsUrl(enPage.url);
  const zh = toCanonicalDocsUrl(zhPage.url);

  return {
    en,
    'zh-Hans': zh,
    'x-default': en,
  };
}
