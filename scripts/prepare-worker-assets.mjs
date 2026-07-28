#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    if (entry.isFile() && entry.name.endsWith('.html')) yield path;
  }
}

export async function localizeChineseDocsHtml(directory) {
  for await (const path of htmlFiles(directory)) {
    const html = await readFile(path, 'utf8');
    await writeFile(path, html.replace('<html lang="en"', '<html lang="zh-Hans"'));
  }
}

export async function prepareWorkerAssets({ outDir = 'out' } = {}) {
  await mkdir(join(outDir, 'docs'), { recursive: true });
  await cp(join(outDir, '_next'), join(outDir, 'docs', '_next'), {
    force: true,
    recursive: true,
  });
  await localizeChineseDocsHtml(join(outDir, 'docs', 'zh-Hans'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prepareWorkerAssets();
}
