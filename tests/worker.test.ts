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

test('wrangler routes the legacy docs host to this worker', () => {
  const wrangler = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  const patterns = wrangler.routes.map((route: { pattern: string }) => route.pattern);

  assert.deepEqual(
    ['docs.mosoo.ai', 'docs.mosoo.ai/*'].filter((pattern) => patterns.includes(pattern)),
    ['docs.mosoo.ai', 'docs.mosoo.ai/*'],
  );
});

test('worker redirects the legacy docs host to canonical docs URLs', async () => {
  const cases = [
    ['https://docs.mosoo.ai/', 'https://mosoo.ai/docs/'],
    ['https://docs.mosoo.ai/quickstart?source=test', 'https://mosoo.ai/docs/quickstart/?source=test'],
    ['https://docs.mosoo.ai/llms.txt', 'https://mosoo.ai/docs/llms.txt'],
  ] as const;

  for (const [from, to] of cases) {
    const response = await worker.fetch(new Request(from), {
      ASSETS: assets(new Response('unused')),
    });

    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), to);
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
