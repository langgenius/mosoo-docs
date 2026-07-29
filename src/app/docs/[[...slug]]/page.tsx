import { getPageImage, getPageMarkdownUrl, getPageUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { OpenAPIPage } from '@/components/api-page';
import { openapi } from '@/lib/openapi';
import {
  buildDocsStructuredData,
  getDocsLanguageAlternates,
  getDocumentLanguage,
  getOpenGraphAlternateLocale,
  toCanonicalDocsUrl,
} from '@/lib/seo';
import { getDocsLanguage, getLocalizedSlugs } from '@/lib/i18n';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const language = getDocsLanguage(params.slug);
  const page = source.getPage(getLocalizedSlugs(params.slug), language);
  if (!page) notFound();

  const MDX = page.data.body;
  const pageUrl = getPageUrl(page);
  const markdownUrl = getPageMarkdownUrl(page).url;
  const description = page.data.description ?? 'mosoo API documentation.';
  const structuredData = buildDocsStructuredData({
    title: page.data.title,
    description,
    pathname: pageUrl,
  });

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
            OpenAPIPage: async (props) => (
              <OpenAPIPage {...(await openapi.preloadOpenAPIPage(page))} {...props} />
            ),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: page.locale === 'zh-Hans' ? ['zh-Hans', ...page.slugs] : page.slugs,
  }));
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const language = getDocsLanguage(params.slug);
  const page = source.getPage(getLocalizedSlugs(params.slug), language);
  if (!page) notFound();
  const pageUrl = getPageUrl(page);
  const canonical = toCanonicalDocsUrl(pageUrl);
  const languages = getDocsLanguageAlternates(page);
  const description = page.data.description ?? 'mosoo API documentation.';
  const documentLanguage = getDocumentLanguage(pageUrl);
  const image = getPageImage(page).url;

  return {
    title: page.data.title,
    description,
    authors: [{ name: 'mosoo', url: 'https://mosoo.ai/' }],
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: 'article',
      siteName: 'mosoo Docs',
      title: page.data.title,
      description,
      url: canonical,
      locale: documentLanguage === 'zh-Hans' ? 'zh_CN' : 'en_US',
      alternateLocale: getOpenGraphAlternateLocale(documentLanguage, Boolean(languages)),
      images: [{ url: image, alt: page.data.title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@mosooagent',
      title: page.data.title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}
