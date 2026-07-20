import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
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
  toCanonicalDocsUrl,
} from '@/lib/seo';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const description = page.data.description ?? 'Mosoo API documentation.';
  const structuredData = buildDocsStructuredData({
    title: page.data.title,
    description,
    pathname: page.url,
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
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  const canonical = toCanonicalDocsUrl(page.url);
  const languages = getDocsLanguageAlternates(page);
  const description = page.data.description ?? 'Mosoo API documentation.';
  const language = getDocumentLanguage(page.url);
  const image = getPageImage(page).url;

  return {
    title: page.data.title,
    description,
    authors: [{ name: 'Mosoo', url: 'https://mosoo.ai/' }],
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type: 'article',
      siteName: 'Mosoo Docs',
      title: page.data.title,
      description,
      url: canonical,
      locale: language === 'zh-Hans' ? 'zh_CN' : 'en_US',
      alternateLocale: language === 'zh-Hans' ? ['en_US'] : ['zh_CN'],
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
