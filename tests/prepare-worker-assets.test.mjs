import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { prepareWorkerAssets } from '../scripts/prepare-worker-assets.mjs';

test('worker asset preparation localizes static Chinese docs HTML', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mosoo-docs-assets-'));
  const out = join(root, 'out');

  await mkdir(join(out, '_next', 'static'), { recursive: true });
  await mkdir(join(out, 'docs', 'zh-Hans', 'quickstart'), { recursive: true });
  await writeFile(join(out, '_next', 'static', 'chunk.js'), 'ok');
  await writeFile(
    join(out, 'docs', 'zh-Hans', 'quickstart', 'index.html'),
    '<!doctype html><html lang="en"><body>快速开始</body></html>',
  );

  await prepareWorkerAssets({ outDir: out });

  assert.equal(await readFile(join(out, 'docs', '_next', 'static', 'chunk.js'), 'utf8'), 'ok');
  assert.match(
    await readFile(join(out, 'docs', 'zh-Hans', 'quickstart', 'index.html'), 'utf8'),
    /<html lang="zh-Hans"/,
  );
});
