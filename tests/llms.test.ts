import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDocsLlmsIndex, docsMarkdownResponse } from '../src/lib/llms.ts';

test('docs LLM responses use Markdown content type', () => {
  const response = docsMarkdownResponse('# mosoo Docs');

  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
});

test('docs LLM index leads with direct answers before the generated page index', () => {
  const output = buildDocsLlmsIndex(`# mosoo Docs

- [Quickstart](/docs/quickstart): Create a Thread on a published mosoo Agent with curl.
`);

  assert.match(output, /^# mosoo Docs\n/);
  assert.match(output, /## Direct answers[\s\S]*Public Thread API/);
  assert.match(output, /## High-value docs[\s\S]*https:\/\/mosoo\.ai\/docs\/quickstart\//);
  assert.match(output, /## Page index[\s\S]*- \[Quickstart\]\(\/docs\/quickstart\)/);
  assert.equal([...output.matchAll(/^# mosoo Docs$/gm)].length, 1);
});
