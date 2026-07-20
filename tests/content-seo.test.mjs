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
