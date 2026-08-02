import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { i18n } from './i18n';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  i18n,
  url(slugs, locale) {
    const language = !locale || locale === 'en' ? '' : `/${locale}`;
    const pathname = slugs.length > 0 ? `/${slugs.join('/')}` : '';
    return `${docsRoute}${language}${pathname}`;
  },
  plugins: [],
});

export function getPageUrl(page: (typeof source)['$inferPage']) {
  const locale = page.locale === 'en' ? '' : `/${page.locale}`;
  const pathname = page.slugs.length > 0 ? `/${page.slugs.join('/')}` : '';
  return `${docsRoute}${locale}${pathname}`;
}

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [
    ...(page.locale === 'en' ? [] : [page.locale]),
    ...page.slugs,
    'image.png',
  ];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [
    ...(page.locale === 'en' ? [] : [page.locale]),
    ...page.slugs,
    'content.md',
  ];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${getPageUrl(page)})

${processed}`;
}
