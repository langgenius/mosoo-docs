import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { buildDocsLlmsIndex, docsMarkdownResponse } from '@/lib/llms';

export const revalidate = false;

export function GET() {
  return docsMarkdownResponse(buildDocsLlmsIndex(llms(source).index()));
}
