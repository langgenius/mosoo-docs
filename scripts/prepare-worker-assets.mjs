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

async function* markdownFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* markdownFiles(path);
    if (entry.isFile() && entry.name === 'content.md') yield path;
  }
}

export async function validateMarkdownExports(directory) {
  const empty = [];
  for await (const path of markdownFiles(directory)) {
    if ((await readFile(path)).length === 0) empty.push(path);
  }

  if (empty.length > 0) {
    throw new Error(`Empty Markdown exports:\n${empty.join('\n')}`);
  }
}

export async function localizeDocsHtml(directory, language) {
  for await (const path of htmlFiles(directory)) {
    const html = await readFile(path, 'utf8');
    await writeFile(path, html.replace('<html lang="en"', `<html lang="${language}"`));
  }
}

export async function prepareWorkerAssets({ outDir = 'out' } = {}) {
  await mkdir(join(outDir, 'docs'), { recursive: true });
  await cp(join(outDir, '_next'), join(outDir, 'docs', '_next'), {
    force: true,
    recursive: true,
  });
  await localizeDocsHtml(join(outDir, 'docs', 'zh-Hans'), 'zh-Hans');
  await localizeDocsHtml(join(outDir, 'docs', 'ja'), 'ja');
  await validateMarkdownExports(join(outDir, 'docs', 'llms.mdx', 'docs'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prepareWorkerAssets();
}
