import { docsMarkdownResponseHeaders } from '@/lib/discovery';
import { renderDocsLlmsFull } from '@/lib/llms';

export const revalidate = false;

export async function GET() {
  return new Response(await renderDocsLlmsFull(), {
    headers: docsMarkdownResponseHeaders(),
  });
}
