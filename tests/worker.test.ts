import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import worker from '../src/worker.ts';

type ElementHandler = (element: {
  setAttribute(name: string, value: string): void;
}) => void;

class TestHTMLRewriter {
  #handler: ElementHandler | undefined;

  on(selector: string, handlers: { element: ElementHandler }) {
    assert.equal(selector, 'html');
    this.#handler = handlers.element;
    return this;
  }

  transform(response: Response) {
    const { readable, writable } = new TransformStream();
    const handler = this.#handler;
    assert.ok(handler);

    void (async () => {
      const html = await response.text();
      let language: string | undefined;
      handler({
        setAttribute(name: string, value: string) {
          assert.equal(name, 'lang');
          language = value;
        },
      });
      assert.ok(language);
      const localized = html.replace(
        /<html(?:\s+lang=(['"])[^'"]*\1)?/,
        `<html lang="${language}"`,
      );
      const writer = writable.getWriter();
      await writer.write(new TextEncoder().encode(localized));
      await writer.close();
    })();

    return new Response(readable, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}

(
  globalThis as typeof globalThis & {
    HTMLRewriter: typeof TestHTMLRewriter;
  }
).HTMLRewriter = TestHTMLRewriter;

function assets(response: Response) {
  return { fetch: async (_request: Request) => response };
}

test('wrangler runs the worker before serving docs assets', () => {
  const wrangler = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  const patterns = wrangler.routes.map((route: { pattern: string }) => route.pattern);

  assert.equal(wrangler.assets.run_worker_first, true);
  assert.deepEqual(
    ['docs.mosoo.ai', 'docs.mosoo.ai/*'].filter((pattern) => patterns.includes(pattern)),
    ['docs.mosoo.ai', 'docs.mosoo.ai/*'],
  );
});

test('worker redirects the legacy docs host to canonical docs URLs', async () => {
  const cases = [
    ['https://docs.mosoo.ai/', 'https://mosoo.ai/docs/'],
    ['https://docs.mosoo.ai/quickstart?source=test', 'https://mosoo.ai/docs/quickstart/?source=test'],
    ['http://docs.mosoo.ai/quickstart?source=test', 'https://mosoo.ai/docs/quickstart/?source=test'],
    ['https://docs.mosoo.ai/llms.txt', 'https://mosoo.ai/docs/llms.txt'],
    ['https://docs.mosoo.ai/robots.txt', 'https://mosoo.ai/robots.txt'],
  ] as const;

  for (const [from, to] of cases) {
    const response = await worker.fetch(new Request(from), {
      ASSETS: assets(new Response('unused')),
    });

    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), to);
  }
});

test('worker permanently redirects legacy docs URLs with clear replacements', async () => {
  const cases = [
    ['https://mosoo.ai/docs/api-reference/complete-thread-file-upload/', 'https://mosoo.ai/docs/files/'],
    ['https://mosoo.ai/docs/api-reference/upload-thread-file-content', 'https://mosoo.ai/docs/files/'],
    ['https://mosoo.ai/docs/api-reference/create-a-thread-file-upload', 'https://mosoo.ai/docs/files/'],
    ['https://mosoo.ai/docs/api-reference/add-a-thread-file/', 'https://mosoo.ai/docs/files/'],
    ['https://mosoo.ai/docs/zh-Hans/api-reference/complete-thread-file-upload', 'https://mosoo.ai/docs/zh-Hans/files/'],
    ['https://mosoo.ai/docs/zh-Hans/api-reference/upload-thread-file-content/', 'https://mosoo.ai/docs/zh-Hans/files/'],
    ['https://mosoo.ai/docs/zh-Hans/api-reference/create-a-thread-file-upload', 'https://mosoo.ai/docs/zh-Hans/files/'],
    ['https://mosoo.ai/docs/zh-Hans/api-reference/add-a-thread-file/', 'https://mosoo.ai/docs/zh-Hans/files/'],
    ['https://docs.mosoo.ai/api-reference/列出-thread-文件', 'https://mosoo.ai/docs/zh-Hans/api-reference/list-thread-files/'],
    ['https://docs.mosoo.ai/api-reference/归档-thread', 'https://mosoo.ai/docs/zh-Hans/api-reference/archive-a-thread/'],
    ['https://docs.mosoo.ai/api-reference/读取-thread-摘要', 'https://mosoo.ai/docs/zh-Hans/api-reference/retrieve-thread-summary/'],
    ['https://docs.mosoo.ai/api-reference/移除-thread-文件', 'https://mosoo.ai/docs/zh-Hans/api-reference/remove-a-thread-file/'],
    ['https://docs.mosoo.ai/api-reference/列出-agent-api-endpoint-的-thread', 'https://mosoo.ai/docs/zh-Hans/api-reference/list-threads-for-an-agent-api-endpoint/'],
    ['https://docs.mosoo.ai/api-reference/为-agent-api-endpoint-创建-thread', 'https://mosoo.ai/docs/zh-Hans/api-reference/create-a-thread-for-an-agent-api-endpoint/'],
    ['https://docs.mosoo.ai/api-reference/下载-thread-文件内容', 'https://mosoo.ai/docs/zh-Hans/api-reference/download-thread-file-content/'],
    ['https://docs.mosoo.ai/api-reference/向-thread-发送用户消息、权限决策或中断', 'https://mosoo.ai/docs/zh-Hans/api-reference/send-user-messages-permission-decisions-or-interrupts-to-a-thread/'],
    ['https://docs.mosoo.ai/api-reference/列出-thread-事件', 'https://mosoo.ai/docs/zh-Hans/api-reference/list-thread-events/'],
    ['https://docs.mosoo.ai/api-reference/取消归档-thread', 'https://mosoo.ai/docs/zh-Hans/api-reference/unarchive-a-thread/'],
    ['https://docs.mosoo.ai/api-reference/删除-thread', 'https://mosoo.ai/docs/zh-Hans/api-reference/delete-a-thread/'],
    ['https://docs.mosoo.ai/api-reference/列出-thread-文件.md', 'https://mosoo.ai/docs/zh-Hans/api-reference/list-thread-files/'],
    ['https://docs.mosoo.ai/zh-Hans.md', 'https://mosoo.ai/docs/zh-Hans/'],
    ['https://docs.mosoo.ai/threads/{threadId}/unarchive', 'https://mosoo.ai/docs/api-reference/unarchive-a-thread/'],
    ['https://docs.mosoo.ai/threads/{threadId}/events', 'https://mosoo.ai/docs/api-reference/list-thread-events/'],
  ] as const;

  for (const [from, to] of cases) {
    const response = await worker.fetch(new Request(from), {
      ASSETS: assets(new Response('unused')),
    });

    assert.equal(response.status, 308, from);
    assert.equal(response.headers.get('location'), to, from);
  }
});

test('worker redirects the bare docs root permanently', async () => {
  const response = await worker.fetch(
    new Request('https://mosoo.ai/docs?source=test'),
    { ASSETS: assets(new Response('unused')) },
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://mosoo.ai/docs/?source=test');
});

test('worker redirects slashless docs pages to canonical trailing-slash URLs', async () => {
  const cases = [
    ['https://mosoo.ai/docs/quickstart?source=test', 'https://mosoo.ai/docs/quickstart/?source=test'],
    ['https://mosoo.ai/docs/zh-Hans', 'https://mosoo.ai/docs/zh-Hans/'],
    ['https://mosoo.ai/docs/zh-Hans/quickstart', 'https://mosoo.ai/docs/zh-Hans/quickstart/'],
  ] as const;

  for (const [from, to] of cases) {
    const response = await worker.fetch(new Request(from), {
      ASSETS: assets(new Response('unused')),
    });

    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), to);
  }
});

test('worker does not treat docs route handlers as slash-normalized pages', async () => {
  const upstream = new Response('{"ok":true}', {
    headers: { 'content-type': 'application/json' },
  });
  const response = await worker.fetch(
    new Request('https://mosoo.ai/docs/api/search'),
    { ASSETS: assets(upstream) },
  );

  assert.equal(response, upstream);
});

test('worker permanently redirects HTTP docs routes to HTTPS', async () => {
  const response = await worker.fetch(
    new Request('http://mosoo.ai/docs/quickstart/?source=test'),
    { ASSETS: assets(new Response('unused')) },
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://mosoo.ai/docs/quickstart/?source=test');
});

test('worker leaves non-HTML assets untouched', async () => {
  const upstream = new Response('{"ok":true}', {
    status: 202,
    headers: { 'content-type': 'application/json', 'x-upstream': 'kept' },
  });
  const response = await worker.fetch(
    new Request('https://mosoo.ai/docs/data.json'),
    { ASSETS: assets(upstream) },
  );

  assert.equal(response, upstream);
  assert.equal(response.status, 202);
  assert.equal(response.headers.get('content-language'), null);
  assert.equal(response.headers.get('x-upstream'), 'kept');
});

const localizedCases = [
  ['/docs/quickstart/', 'en'],
  ['/docs/zh-Hans/quickstart/', 'zh-Hans'],
  ['/docs/ja/quickstart/', 'ja'],
] as const;

for (const [pathname, language] of localizedCases) {
  test(`worker localizes HTML responses for ${pathname}`, async () => {
    const response = await worker.fetch(
      new Request(`https://mosoo.ai${pathname}`),
      {
        ASSETS: assets(
          new Response('<!doctype html><html lang="en"><body>Docs</body></html>', {
            status: 201,
            statusText: 'Created',
            headers: { 'content-type': 'text/html; charset=utf-8', 'x-upstream': 'kept' },
          }),
        ),
      },
    );

    assert.equal(response.status, 201);
    assert.equal(response.statusText, 'Created');
    assert.equal(response.headers.get('x-upstream'), 'kept');
    assert.equal(response.headers.get('content-language'), language);
    assert.equal(
      response.headers.get('link'),
      '</docs/llms.txt>; rel="llms-txt", </docs/llms-full.txt>; rel="llms-full-txt"',
    );
    assert.match(await response.text(), new RegExp(`<html lang="${language}">`));
  });
}
