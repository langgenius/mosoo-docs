import { getLLMText, source } from '@/lib/source';
import { docsMarkdownHeaders } from '@/lib/shared';

export const revalidate = false;

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'), {
    headers: docsMarkdownHeaders,
  });
}
