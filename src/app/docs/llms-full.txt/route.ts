import { getLLMText, source } from '@/lib/source';
import { docsMarkdownResponse } from '@/lib/llms';

export const revalidate = false;

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return docsMarkdownResponse(scanned.join('\n\n'));
}
