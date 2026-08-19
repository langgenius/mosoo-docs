import { docsMarkdownResponseHeaders } from '@/lib/discovery';
import { renderDocsLlmsIndex } from '@/lib/llms';

export const revalidate = false;

export function GET() {
  return new Response(renderDocsLlmsIndex(), {
    headers: docsMarkdownResponseHeaders(),
  });
}
