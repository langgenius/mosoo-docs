import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDocsStructuredData,
  buildSitemapEntries,
  getDocumentLanguage,
  getLanguageAlternates,
  toCanonicalDocsUrl,
} from '../src/lib/seo-core.ts';

const translatedPages = new Set([
  '/docs',
  '/docs/quickstart',
  '/docs/zh-Hans',
  '/docs/zh-Hans/quickstart',
]);

test('canonical docs URLs always use the public origin and a trailing slash', () => {
  assert.equal(toCanonicalDocsUrl('/docs'), 'https://mosoo.ai/docs/');
  assert.equal(toCanonicalDocsUrl('/docs/quickstart/'), 'https://mosoo.ai/docs/quickstart/');
});

test('translated docs pages expose reciprocal language alternates', () => {
  assert.deepEqual(getLanguageAlternates('/docs/zh-Hans/quickstart', translatedPages), {
    en: 'https://mosoo.ai/docs/quickstart/',
    'zh-Hans': 'https://mosoo.ai/docs/zh-Hans/quickstart/',
    'x-default': 'https://mosoo.ai/docs/quickstart/',
  });
});

test('pages without a translation do not emit incomplete hreflang clusters', () => {
  assert.equal(getLanguageAlternates('/docs/english-only', translatedPages), undefined);
});

test('document language follows the localized URL prefix', () => {
  assert.equal(getDocumentLanguage('/docs/quickstart'), 'en');
  assert.equal(getDocumentLanguage('/docs/zh-Hans/quickstart'), 'zh-Hans');
});

test('sitemap entries are canonical, sorted, and include language alternates', () => {
  assert.deepEqual(
    buildSitemapEntries(
      [{ url: '/docs/zh-Hans/quickstart' }, { url: '/docs' }, { url: '/docs/quickstart' }, { url: '/docs/zh-Hans' }],
    ),
    [
      {
        url: 'https://mosoo.ai/docs/',
        alternates: {
          languages: {
            en: 'https://mosoo.ai/docs/',
            'zh-Hans': 'https://mosoo.ai/docs/zh-Hans/',
            'x-default': 'https://mosoo.ai/docs/',
          },
        },
      },
      {
        url: 'https://mosoo.ai/docs/quickstart/',
        alternates: {
          languages: {
            en: 'https://mosoo.ai/docs/quickstart/',
            'zh-Hans': 'https://mosoo.ai/docs/zh-Hans/quickstart/',
            'x-default': 'https://mosoo.ai/docs/quickstart/',
          },
        },
      },
      {
        url: 'https://mosoo.ai/docs/zh-Hans/',
        alternates: {
          languages: {
            en: 'https://mosoo.ai/docs/',
            'zh-Hans': 'https://mosoo.ai/docs/zh-Hans/',
            'x-default': 'https://mosoo.ai/docs/',
          },
        },
      },
      {
        url: 'https://mosoo.ai/docs/zh-Hans/quickstart/',
        alternates: {
          languages: {
            en: 'https://mosoo.ai/docs/quickstart/',
            'zh-Hans': 'https://mosoo.ai/docs/zh-Hans/quickstart/',
            'x-default': 'https://mosoo.ai/docs/quickstart/',
          },
        },
      },
    ],
  );
});

test('docs structured data identifies the page, language, and breadcrumb trail', () => {
  const data = buildDocsStructuredData({
    title: 'Quickstart',
    description: 'Create a Thread with curl.',
    pathname: '/docs/zh-Hans/quickstart',
  });

  assert.equal(data['@type'], 'TechArticle');
  assert.equal(data.inLanguage, 'zh-Hans');
  assert.equal(data.url, 'https://mosoo.ai/docs/zh-Hans/quickstart/');
  assert.equal(data.breadcrumb.itemListElement.at(-1)?.name, 'Quickstart');
});
