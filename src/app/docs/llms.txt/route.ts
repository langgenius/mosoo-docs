import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { docsMarkdownHeaders } from '@/lib/agent-discovery';

export const revalidate = false;

export function GET() {
  return new Response(llms(source).index(), {
    headers: docsMarkdownHeaders(),
  });
}
