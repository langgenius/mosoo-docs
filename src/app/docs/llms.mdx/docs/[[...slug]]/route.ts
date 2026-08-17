import { getLLMText, getPageMarkdownUrl, source } from '@/lib/source';
import { getDocsLanguage, getLocalizedSlugs } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import { docsLlmHeaders } from '@/lib/shared';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'/docs/llms.mdx/docs/[[...slug]]'>,
) {
  const { slug } = await params;
  // remove the appended "content.md"
  const pageSlugs = slug?.slice(0, -1);
  const page = source.getPage(getLocalizedSlugs(pageSlugs), getDocsLanguage(pageSlugs));
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: docsLlmHeaders,
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageMarkdownUrl(page).segments,
  }));
}
