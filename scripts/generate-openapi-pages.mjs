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
const englishOperationSlugs = new Map();
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

const apiReferenceGroups = [
  {
    enTitle: 'Threads',
    zhHansTitle: 'Threads',
    keys: [
      'POST /agents/{agentId}/threads',
      'GET /agents/{agentId}/threads',
      'GET /threads/{threadId}',
      'POST /threads/{threadId}/archive',
      'POST /threads/{threadId}/unarchive',
      'DELETE /threads/{threadId}',
    ],
  },
  {
    enTitle: 'Events',
    zhHansTitle: 'Events',
    keys: [
      'POST /threads/{threadId}/events',
      'GET /threads/{threadId}/events',
      'GET /threads/{threadId}/events/stream',
    ],
  },
  {
    enTitle: 'Files',
    zhHansTitle: 'Files',
    keys: [
      'POST /agents/{agentId}/files',
      'GET /files/{fileId}',
      'GET /threads/{threadId}/files',
      'GET /files/{fileId}/content',
      'DELETE /files/{fileId}',
      'DELETE /threads/{threadId}/files/{fileId}',
    ],
  },
];

const apiReferenceOrder = apiReferenceGroups.flatMap((group) => group.keys);

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

for (const [operationPath, methods] of Object.entries(englishSpec.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods ?? {})) {
    if (!operation || typeof operation !== 'object') {
      continue;
    }

    const key = `${method.toUpperCase()} ${operationPath}`;
    englishOperationSlugs.set(
      key,
      slugify(englishOperationTitles.get(key) ?? operation.summary ?? key),
    );
  }
}

const orderedApiReferenceSlugs = apiReferenceOrder
  .map((key) => englishOperationSlugs.get(key))
  .filter((slug) => typeof slug === 'string');

function titleFromGeneratedFile(file) {
  const match = /^title:\s*(?:"([^"]+)"|(.+))$/m.exec(file.content);
  return match?.[1] ?? match?.[2]?.trim() ?? path.basename(file.path, '.mdx');
}

function toSeoDescription(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 160) return normalized;

  const candidate = normalized.slice(0, 157);
  const sentenceEnd = Math.max(
    candidate.lastIndexOf('. '),
    candidate.lastIndexOf('。'),
    candidate.lastIndexOf('！'),
    candidate.lastIndexOf('？'),
  );
  if (sentenceEnd >= 80) return candidate.slice(0, sentenceEnd + 1).trim();
  return `${candidate.trimEnd()}…`;
}

function operationDescriptions(specDocument) {
  const descriptions = new Map();

  for (const [operationPath, methods] of Object.entries(specDocument.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods ?? {})) {
      if (!operation || typeof operation !== 'object') continue;

      const key = `${method.toUpperCase()} ${operationPath}`;
      const slug = englishOperationSlugs.get(key);
      const source = operation.description ?? operation.summary;
      if (slug && typeof source === 'string' && source.trim()) {
        descriptions.set(slug, toSeoDescription(source));
      }
    }
  }

  return descriptions;
}

function addDescription(file, description) {
  if (/^description:/m.test(file.content)) return;
  file.content = file.content.replace(
    /^title:.*$/m,
    (title) => `${title}\ndescription: ${JSON.stringify(description)}`,
  );
}

function groupedIndexContent(spec, files) {
  const title = JSON.stringify(spec.title);
  const description = JSON.stringify(spec.description);
  const lines = [
    '---',
    `title: ${title}`,
    `description: ${description}`,
    '---',
    '',
    '{/* This file is generated from the Mosoo OpenAPI snapshot. Run npm run openapi:pages after changing the spec. */}',
  ];

  for (const group of apiReferenceGroups) {
    const groupTitle = spec.id === 'zh-Hans' ? group.zhHansTitle : group.enTitle;
    lines.push('', `## ${groupTitle}`, '', '<Cards>');

    for (const key of group.keys) {
      const slug = englishOperationSlugs.get(key);
      const file = files.find((entry) => entry.path === `${slug}.mdx`);

      if (!slug || !file) {
        continue;
      }

      const titleAttr = JSON.stringify(titleFromGeneratedFile(file));
      lines.push(`<Card href="${spec.baseUrl}/${slug}" title=${titleAttr} />`);
    }

    lines.push('</Cards>');
  }

  return `${lines.join('\n')}\n`;
}

async function generateSpecPages(spec) {
  const specDocument = JSON.parse(await readFile(spec.input, 'utf8'));
  const descriptions = operationDescriptions(specDocument);
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
          only: orderedApiReferenceSlugs.map((slug) => `${slug}.mdx`),
        },
      ],
    },
    name(output) {
      return path.posix.join(operationSlug(output));
    },
    beforeWrite(files) {
      for (const file of files) {
        if (!file.path.endsWith('.mdx') || file.path === 'index.mdx') continue;
        const slug = path.basename(file.path, '.mdx');
        const description = descriptions.get(slug);
        if (description) addDescription(file, description);
      }

      const meta = files.find((file) => file.path === 'meta.json');
      if (meta) {
        const parsed = JSON.parse(meta.content);
        const pages = new Set(parsed.pages);
        const orderedPages = orderedApiReferenceSlugs.filter((slug) => pages.has(slug));
        const remainingPages = parsed.pages.filter((page) => !orderedPages.includes(page));
        meta.content = JSON.stringify(
          {
            ...parsed,
            pages: [...orderedPages, ...remainingPages],
          },
          null,
          2,
        );
      }

      const index = files.find((file) => file.path === 'index.mdx');
      if (index) {
        index.content = groupedIndexContent(spec, files);
      }
    },
  });
}

for (const spec of specs) {
  await generateSpecPages(spec);
}
