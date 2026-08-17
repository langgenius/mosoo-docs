import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { docsLlmHeaders } from '@/lib/shared';

export const revalidate = false;

export function GET() {
  return new Response(llms(source).index(), {
    headers: docsLlmHeaders,
  });
}
