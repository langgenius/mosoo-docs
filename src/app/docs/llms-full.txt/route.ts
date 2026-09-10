import { getLLMText, source } from '@/lib/source';
import { docsDiscoveryHeaders } from '@/lib/agent-discovery';

export const revalidate = false;

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'), {
    headers: docsDiscoveryHeaders('/docs/llms-full.txt'),
  });
}
