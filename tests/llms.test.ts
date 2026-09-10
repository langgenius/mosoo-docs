import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeDocsNode, toAbsoluteDocsLink } from '../src/lib/llms-core.ts';
import { buildDocsLlmsIndex } from '../src/lib/llms.ts';

test('docs links become absolute without losing queries, fragments, or asset paths', () => {
  const cases = [
    ['/docs', 'https://mosoo.ai/docs/'],
    ['/docs/ja/quickstart?from=llms#files', 'https://mosoo.ai/docs/ja/quickstart/?from=llms#files'],
    ['/docs/llms.txt', 'https://mosoo.ai/docs/llms.txt'],
    ['/docs/api/search?query=tools', 'https://mosoo.ai/docs/api/search?query=tools'],
    ['/docs/images/product/agent.png', 'https://mosoo.ai/docs/images/product/agent.png'],
    ['/docs-other/page', '/docs-other/page'],
    ['https://example.com/docs/page', 'https://example.com/docs/page'],
    ['#section', '#section'],
  ];
  for (const [input, expected] of cases) assert.equal(toAbsoluteDocsLink(input), expected);
});

test('Markdown export rewrites parsed links and cards without mutating source nodes', () => {
  const link = { type: 'link', url: '/docs/quickstart#files', children: [{ type: 'text', value: 'Start' }] } as const;
  const originalLink = { ...link, children: [...link.children] };
  assert.deepEqual(canonicalizeDocsNode(originalLink), {
    ...originalLink, url: 'https://mosoo.ai/docs/quickstart/#files',
  });
  assert.equal(originalLink.url, '/docs/quickstart#files');
  const card = {
    type: 'mdxJsxFlowElement' as const, name: 'Card', children: [],
    attributes: [{ type: 'mdxJsxAttribute' as const, name: 'href', value: '/docs/ja/quickstart' }],
  };
  assert.deepEqual(canonicalizeDocsNode(card), {
    ...card, attributes: [{ ...card.attributes[0], value: 'https://mosoo.ai/docs/ja/quickstart/' }],
  });
  assert.equal(card.attributes[0].value, '/docs/ja/quickstart');
});

test('code examples that look like links are not rewritten', () => {
  for (const type of ['code', 'inlineCode'] as const) {
    const example = { type, value: '[Example](/docs/quickstart)' };
    assert.deepEqual(canonicalizeDocsNode(example), example);
  }
});

test('LLM index keeps all languages below one answer-first heading with current authentication', () => {
  const index = buildDocsLlmsIndex('# mosoo Docs\n- [Start](/docs/quickstart)\n\n# 中文文档\n- [开始](/docs/zh-Hans/quickstart)\n\n# 日本語\n- [開始](/docs/ja/quickstart)');
  assert.equal([...index.matchAll(/^# /gm)].length, 1);
  assert.ok(index.indexOf('## Direct answers') < index.indexOf('## Page index'));
  assert.match(index, /Project API key \(msp_\)/);
  assert.match(index, /Projects isolate Agents/);
  assert.doesNotMatch(index, /Apps isolate|App.owner token/);
  for (const locale of ['', 'zh-Hans/', 'ja/']) {
    assert.ok(index.includes(`https://mosoo.ai/docs/${locale}quickstart/`));
  }
  assert.match(index, /### 中文文档/);
  assert.match(index, /### 日本語/);
});
