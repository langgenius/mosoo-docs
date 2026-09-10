import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { docsDiscoveryHeaders } from '@/lib/agent-discovery';
import { buildDocsLlmsIndex } from '@/lib/llms';

export const revalidate = false;

export function GET() {
  return new Response(buildDocsLlmsIndex(llms(source).index()), {
    headers: docsDiscoveryHeaders('/docs/llms.txt'),
  });
}
