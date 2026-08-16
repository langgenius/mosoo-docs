import { source } from '@/lib/source';
import { docsMarkdownHeaders } from '@/lib/shared';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  return new Response(llms(source).index(), {
    headers: docsMarkdownHeaders,
  });
}
