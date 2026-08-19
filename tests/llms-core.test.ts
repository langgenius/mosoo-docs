import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contentSignal,
  docsDiscoveryLinkHeader,
  docsMarkdownResponseHeaders,
} from '../src/lib/discovery.ts';
import { canonicalizeDocsMarkdownLinks } from '../src/lib/llms-core.ts';

test('docs LLM markdown links use absolute canonical page URLs', () => {
  const markdown = [
    '- [Docs](/docs): Start here.',
    '- [Quickstart](/docs/quickstart): Create a Thread.',
    '- [Section](/docs/zh-Hans/quickstart#files): Upload files.',
    '- [Search API](/docs/api/search): JSON route.',
    '- [LLMs](/docs/llms.txt): Text index.',
  ].join('\n');

  assert.equal(
    canonicalizeDocsMarkdownLinks(markdown),
    [
      '- [Docs](https://mosoo.ai/docs/): Start here.',
      '- [Quickstart](https://mosoo.ai/docs/quickstart/): Create a Thread.',
      '- [Section](https://mosoo.ai/docs/zh-Hans/quickstart/#files): Upload files.',
      '- [Search API](/docs/api/search): JSON route.',
      '- [LLMs](/docs/llms.txt): Text index.',
    ].join('\n'),
  );
});

test('docs markdown responses expose machine-discovery crawl headers', () => {
  assert.deepEqual(docsMarkdownResponseHeaders(), {
    'content-signal': contentSignal,
    'content-type': 'text/markdown; charset=utf-8',
    link: docsDiscoveryLinkHeader,
  });
});
