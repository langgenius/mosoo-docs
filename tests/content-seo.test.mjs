import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../content/docs', import.meta.url));

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith('.mdx') ? [path] : [];
  });
}

function frontmatter(content) {
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(content);
  return match?.[1] ?? '';
}

function field(block, name) {
  const match = new RegExp(`^${name}:\\s*(?:"([^"]+)"|'([^']+)'|(.+))$`, 'm').exec(block);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
}

test('SEO regressions run as part of every production build', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.match(packageJson.scripts.build, /npm run openapi:pages && npm run test:seo && next build/);
});

test('every indexable docs page has a title and meta description', () => {
  const missing = [];

  for (const path of walk(root)) {
    const block = frontmatter(readFileSync(path, 'utf8'));
    for (const name of ['title', 'description']) {
      if (!field(block, name)) missing.push(`${relative(root, path)}: ${name}`);
    }
  }

  assert.deepEqual(missing, []);
});

test('Chinese docs display titles contain Chinese text', () => {
  const missingChinese = [];
  const chineseRoot = join(root, 'zh-Hans');

  for (const path of walk(chineseRoot)) {
    const content = readFileSync(path, 'utf8');
    const page = relative(root, path);
    const displayTitles = [
      ['title', field(frontmatter(content), 'title')],
      ...[...content.matchAll(/^##+\s+(.+)$/gm)].map((match) => ['heading', match[1]]),
      ...[...content.matchAll(/<Card\b[^>]*\btitle="([^"]+)"/g)].map((match) => [
        'card',
        match[1],
      ]),
    ];

    for (const [kind, title] of displayTitles) {
      const isCodeIdentifier = kind === 'heading' && /^`[^`]+`$/.test(title);
      if (!isCodeIdentifier && !/\p{Script=Han}/u.test(title)) {
        missingChinese.push(`${page}: ${kind}: ${title}`);
      }
    }
  }

  assert.deepEqual(missingChinese, []);
});

test('Japanese docs mirror the translated page set and contain Japanese copy', () => {
  const chineseRoot = join(root, 'zh-Hans');
  const japaneseRoot = join(root, 'ja');
  const relativePages = (directory) => walk(directory).map((path) => relative(directory, path)).sort();
  assert.deepEqual(relativePages(japaneseRoot), relativePages(chineseRoot));

  const missingJapanese = [];
  const unlocalizedLinks = [];
  for (const path of walk(japaneseRoot)) {
    const content = readFileSync(path, 'utf8');
    const page = relative(root, path);
    const block = frontmatter(content);
    const visibleCopy = [field(block, 'title'), field(block, 'description'), content].join('\n');
    if (!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(visibleCopy)) {
      missingJapanese.push(page);
    }
    if (/href="\/docs\/(?!ja\/|images\/)/.test(content)) {
      unlocalizedLinks.push(page);
    }
  }

  assert.deepEqual(missingJapanese, []);
  assert.deepEqual(unlocalizedLinks, []);
});
