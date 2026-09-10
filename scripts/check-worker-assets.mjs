import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { unstable_dev } from 'wrangler';

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

function markdownAlternate(html) {
  const link = [...html.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])))
    .find((attributes) => attributes.rel === 'alternate' && attributes.type === 'text/markdown');
  return link?.href;
}

function checkDiscovery(response, pathname) {
  assert.equal(response.status, 200, pathname);
  assert.equal(response.headers.get('content-signal'), 'ai-train=no, search=yes, ai-input=yes', pathname);
  const link = response.headers.get('link') ?? '';
  assert.doesNotMatch(link, /rel="llms-(?:full-)?txt"|<\/auth\.md>|<\/llms\.txt>/, pathname);
  if (pathname !== '/docs/llms.txt') {
    assert.match(link, /<\/docs\/llms\.txt>; rel="describedby"; type="text\/markdown"/, pathname);
  }
  assert.match(link, /rel="service-desc"; type="application\/json"/, pathname);
}

const pages = [];
for await (const file of htmlFiles('out/docs')) {
  const html = await readFile(file, 'utf8');
  for (const [, raw] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) {
    const article = JSON.parse(raw);
    if (article['@type'] !== 'TechArticle') continue;
    const pathname = new URL(article.url).pathname;
    const markdown = new URL(article.encoding[0].contentUrl).pathname;
    assert.equal(new URL(markdownAlternate(html), 'https://mosoo.ai').pathname, markdown, pathname);
    pages.push({ pathname, markdown });
  }
}
assert.ok(pages.length > 0, 'No generated article pages found; run the build first.');

const worker = await unstable_dev('src/worker.ts', {
  // Serve over loopback HTTP while giving the Worker a production-like HTTPS URL.
  config: 'wrangler.jsonc', local: true, localProtocol: 'http', ip: '127.0.0.1',
  upstreamProtocol: 'https',
  port: 0, persist: false, logLevel: 'error',
  experimental: { disableExperimentalWarning: true, disableDevRegistry: true, watch: false },
});

function fetchPath(pathname, init = {}) {
  // Never follow a redirect out of the local Worker to production.
  return worker.fetch(`https://mosoo.ai${pathname}`, { ...init, redirect: 'manual' });
}

try {
  for (const { pathname, markdown } of pages) {
    const page = await fetchPath(pathname);
    checkDiscovery(page, pathname);
    assert.equal(new URL(markdownAlternate(await page.text()), 'https://mosoo.ai').pathname, markdown, pathname);

    const response = await fetchPath(markdown);
    checkDiscovery(response, markdown);
    assert.match(response.headers.get('content-type') ?? '', /^text\/markdown; charset=utf-8$/);
    assert.ok(response.headers.get('link')?.includes(`<${pathname}>; rel="alternate"; type="text/html"`), markdown);
    const body = await response.text();
    assert.ok(body.includes(`(https://mosoo.ai${pathname})`), markdown);
    assert.ok(body.trim().length > 0, markdown);
  }

  for (const pathname of ['/docs/llms.txt', '/docs/llms-full.txt']) {
    const response = await fetchPath(pathname);
    checkDiscovery(response, pathname);
    assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
    const body = await response.text();
    assert.match(body, /Project API key/);
    if (pathname === '/docs/llms.txt') {
      assert.match(body, /## Direct answers[\s\S]*## Page index/);
      assert.equal([...body.matchAll(/^# /gm)].length, 1);
      for (const { pathname: pagePath } of pages) assert.ok(body.includes(`https://mosoo.ai${pagePath}`), pagePath);
    }
    const head = await fetchPath(pathname, { method: 'HEAD' });
    checkDiscovery(head, pathname);
    assert.equal(await head.text(), '');
  }

  for (const pathname of ['/docs/missing-discovery-page/', '/docs/llms.mdx/docs/missing-discovery-page/content.md']) {
    const response = await fetchPath(pathname);
    assert.equal(response.status, 404, pathname);
    assert.equal(response.headers.get('content-signal'), null, pathname);
    assert.equal(response.headers.get('link'), null, pathname);
    await response.arrayBuffer();
  }

  const changelog = await fetchPath('/docs/changelog/');
  checkDiscovery(changelog, '/docs/changelog/');
  assert.equal(markdownAlternate(await changelog.text()), undefined, 'Changelog has no Markdown export');

  const openapiPath = '/docs/openapi/mosoo-openapi.en.generated.json';
  const openapi = await fetchPath(openapiPath);
  assert.equal(openapi.headers.get('content-signal'), null);
  assert.deepEqual(await openapi.json(), JSON.parse(await readFile(`public${openapiPath}`, 'utf8')));

  console.log(`Verified ${pages.length} built article/Markdown pairs, LLM indexes, HEAD, errors, changelog, and OpenAPI through the local Worker.`);
} finally {
  await worker.stop();
}
