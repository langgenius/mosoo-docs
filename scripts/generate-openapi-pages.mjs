#!/usr/bin/env node

import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { generateFiles } from 'fumadocs-openapi';
import { createOpenAPI } from 'fumadocs-openapi/server';

const specs = [
  {
    id: 'en',
    input: './public/docs/openapi/mosoo-openapi.en.generated.json',
    output: './content/docs/api-reference',
    baseUrl: '/docs/api-reference',
    title: 'API Reference',
    description: 'Generated reference for the Mosoo Public Thread API.',
  },
  {
    id: 'zh-Hans',
    input: './public/docs/openapi/mosoo-openapi.zh-Hans.generated.json',
    output: './content/docs/zh-Hans/api-reference',
    baseUrl: '/docs/zh-Hans/api-reference',
    title: 'API Reference',
    description: 'Mosoo 公开 Thread API 的生成参考。',
  },
];

const englishSpec = JSON.parse(
  await readFile('./public/docs/openapi/mosoo-openapi.en.generated.json', 'utf8'),
);

const englishOperationTitles = new Map();
for (const [operationPath, methods] of Object.entries(englishSpec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods ?? {})) {
    if (!operation || typeof operation !== 'object' || !('summary' in operation)) {
      continue;
    }

    englishOperationTitles.set(
      `${method.toUpperCase()} ${operationPath}`,
      operation.summary,
    );
  }
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fallbackOperationSlug(output) {
  if (output.type !== 'operation') {
    return slugify(output.info.title);
  }

  const pathSlug = output.item.path
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .join('-');

  return slugify(`${output.item.method}-${pathSlug}`);
}

function operationSlug(output) {
  if (output.type !== 'operation') {
    return slugify(output.info.title);
  }

  const key = `${output.item.method.toUpperCase()} ${output.item.path}`;
  const englishTitle = englishOperationTitles.get(key);

  return slugify(englishTitle ?? output.info.title) || fallbackOperationSlug(output);
}

async function generateSpecPages(spec) {
  await rm(spec.output, { force: true, recursive: true });

  const server = createOpenAPI({
    input: {
      [spec.id]: spec.input,
    },
  });

  await generateFiles({
    input: server,
    output: spec.output,
    per: 'operation',
    includeDescription: true,
    addGeneratedComment:
      'This file is generated from the Mosoo OpenAPI snapshot. Run npm run openapi:pages after changing the spec.',
    meta: {
      folderStyle: 'separator',
    },
    index: {
      url: (filePath) =>
        `${spec.baseUrl}/${filePath.replace(/\.mdx$/, '')}`,
      items: [
        {
          path: 'index.mdx',
          title: spec.title,
          description: spec.description,
        },
      ],
    },
    name(output) {
      return path.posix.join(operationSlug(output));
    },
  });
}

for (const spec of specs) {
  await generateSpecPages(spec);
}
