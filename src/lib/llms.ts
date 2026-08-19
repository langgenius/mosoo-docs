import { llms } from 'fumadocs-core/source';
import { canonicalizeDocsMarkdownLinks } from './llms-core';
import { getLLMText, source } from './source';

export function renderDocsLlmsIndex() {
  return canonicalizeDocsMarkdownLinks(llms(source).index());
}

export async function renderDocsLlmsFull() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return canonicalizeDocsMarkdownLinks(scanned.join('\n\n'));
}
