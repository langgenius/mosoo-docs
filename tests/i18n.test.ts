import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDocsLanguageFromPathname,
  getLocalizedDocsPath,
} from '../src/lib/i18n.ts';

test('docs language detection only matches a complete zh-Hans path segment', () => {
  assert.equal(getDocsLanguageFromPathname('/docs'), 'en');
  assert.equal(getDocsLanguageFromPathname('/docs/quickstart'), 'en');
  assert.equal(getDocsLanguageFromPathname('/docs/zh-Hans'), 'zh-Hans');
  assert.equal(getDocsLanguageFromPathname('/docs/zh-Hans/quickstart'), 'zh-Hans');
  assert.equal(getDocsLanguageFromPathname('/docs/zh-Hans-extra'), 'en');
});

test('language switching preserves the corresponding docs path', () => {
  assert.equal(getLocalizedDocsPath('/docs', 'zh-Hans'), '/docs/zh-Hans');
  assert.equal(
    getLocalizedDocsPath('/docs/quickstart/', 'zh-Hans'),
    '/docs/zh-Hans/quickstart/',
  );
  assert.equal(
    getLocalizedDocsPath('/docs/zh-Hans/quickstart/', 'en'),
    '/docs/quickstart/',
  );
  assert.equal(getLocalizedDocsPath('/docs/zh-Hans', 'en'), '/docs');
});

test('language switching falls back to the target language root when a translation is missing', () => {
  const availablePaths = ['/docs/', '/docs/coding-agents/', '/docs/zh-Hans/'];

  assert.equal(
    getLocalizedDocsPath('/docs/coding-agents', 'zh-Hans', availablePaths),
    '/docs/zh-Hans',
  );
});

test('translation availability ignores trailing slash differences', () => {
  assert.equal(
    getLocalizedDocsPath('/docs/quickstart/', 'zh-Hans', [
      '/docs/',
      '/docs/zh-Hans/',
      '/docs/zh-Hans/quickstart/',
    ]),
    '/docs/zh-Hans/quickstart/',
  );
});
