import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';
import { appName } from '@/lib/shared';
import { getDocsLanguage, getLocalizedSlugs } from '@/lib/i18n';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/docs/og/docs/[...slug]'>) {
  const { slug } = await params;
  const pageSlugs = slug.slice(0, -1);
  const page = source.getPage(getLocalizedSlugs(pageSlugs), getDocsLanguage(pageSlugs));
  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site={appName} />,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
