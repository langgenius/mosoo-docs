import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDocsStructuredData,
  buildSitemapEntries,
  getDocumentLanguage,
  getLanguageAlternates,
  getOpenGraphAlternateLocale,
  toCanonicalDocsUrl,
} from '../src/lib/seo-core.ts';

const translatedPages = new Set([
  '/docs',
  '/docs/quickstart',
  '/docs/zh-Hans',
  '/docs/zh-Hans/quickstart',
  '/docs/ja',
  '/docs/ja/quickstart',
]);

test('canonical docs URLs always use the public origin and a trailing slash', () => {
  assert.equal(toCanonicalDocsUrl('/docs'), 'https://mosoo.ai/docs/');
  assert.equal(toCanonicalDocsUrl('/docs/quickstart/'), 'https://mosoo.ai/docs/quickstart/');
});

test('translated docs pages expose reciprocal language alternates', () => {
  assert.deepEqual(getLanguageAlternates('/docs/zh-Hans/quickstart', translatedPages), {
    en: 'https://mosoo.ai/docs/quickstart/',
    'zh-Hans': 'https://mosoo.ai/docs/zh-Hans/quickstart/',
    ja: 'https://mosoo.ai/docs/ja/quickstart/',
    'x-default': 'https://mosoo.ai/docs/quickstart/',
  });
});

test('pages without a translation do not emit incomplete hreflang clusters', () => {
  assert.equal(getLanguageAlternates('/docs/english-only', translatedPages), undefined);
  assert.equal(
    getLanguageAlternates('/docs/quickstart', new Set([...translatedPages].filter((path) => !path.startsWith('/docs/ja')))),
    undefined,
  );
});

test('document language follows the localized URL prefix', () => {
  assert.equal(getDocumentLanguage('/docs/quickstart'), 'en');
  assert.equal(getDocumentLanguage('/docs/zh-Hans/quickstart'), 'zh-Hans');
  assert.equal(getDocumentLanguage('/docs/ja/quickstart'), 'ja');
});

test('Open Graph only advertises locale alternates for translated pages', () => {
  assert.deepEqual(getOpenGraphAlternateLocale('en', true), ['zh_CN', 'ja_JP']);
  assert.deepEqual(getOpenGraphAlternateLocale('zh-Hans', true), ['en_US', 'ja_JP']);
  assert.deepEqual(getOpenGraphAlternateLocale('ja', true), ['en_US', 'zh_CN']);
  assert.equal(getOpenGraphAlternateLocale('en', false), undefined);
});

test('sitemap entries are canonical, sorted, and include language alternates', () => {
  const entries = buildSitemapEntries([
    { url: '/docs/zh-Hans/quickstart' },
    { url: '/docs/ja' },
    { url: '/docs' },
    { url: '/docs/ja/quickstart' },
    { url: '/docs/quickstart' },
    { url: '/docs/zh-Hans' },
  ]);
  const urls = entries.map((entry) => entry.url);
  assert.deepEqual(urls, urls.toSorted());

  for (const entry of entries) {
    const suffix = entry.url.includes('quickstart') ? 'quickstart/' : '';
    assert.deepEqual(entry.alternates?.languages, {
      en: `https://mosoo.ai/docs/${suffix}`,
      'zh-Hans': `https://mosoo.ai/docs/zh-Hans/${suffix}`,
      ja: `https://mosoo.ai/docs/ja/${suffix}`,
      'x-default': `https://mosoo.ai/docs/${suffix}`,
    });
  }
});

test('docs structured data identifies the page, language, and breadcrumb trail', () => {
  const data = buildDocsStructuredData({
    title: 'Quickstart',
    description: 'Create a Thread with curl.',
    pathname: '/docs/ja/quickstart',
  });

  assert.equal(data['@type'], 'TechArticle');
  assert.equal(data.inLanguage, 'ja');
  assert.equal(data.url, 'https://mosoo.ai/docs/ja/quickstart/');
  assert.deepEqual(data.author, { '@id': 'https://mosoo.ai/#organization' });
  assert.deepEqual(data.publisher, { '@id': 'https://mosoo.ai/#organization' });
  assert.equal(data.breadcrumb.itemListElement.at(-1)?.name, 'Quickstart');
});
