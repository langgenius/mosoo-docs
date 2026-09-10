import type { Metadata } from 'next';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { ChangelogEntryBlock, ChangelogToolbar } from '@/components/changelog';
import {
  changelogFeedRoute,
  changelogRoute,
  entryAnchor,
  getChangelogEntries,
} from '@/lib/changelog';
import { toCanonicalDocsUrl } from '@/lib/seo';

const title = 'Changelog';
const description = 'A full rundown of Mosoo releases, improvements, and fixes.';
const canonical = toCanonicalDocsUrl(`${changelogRoute}/`);

export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: 'mosoo', url: 'https://mosoo.ai/' }],
  alternates: {
    canonical,
    types: { 'application/rss+xml': changelogFeedRoute },
  },
  openGraph: {
    type: 'website',
    siteName: 'mosoo Docs',
    title,
    description,
    url: canonical,
  },
};

export default function ChangelogPage() {
  const entries = getChangelogEntries();
  const toc = entries.map((entry) => ({
    title: entry.data.title,
    url: `#${entryAnchor(entry)}`,
    depth: 2,
  }));

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{title}</DocsTitle>
      <DocsDescription className="mb-6">{description}</DocsDescription>
      <ChangelogToolbar />
      <DocsBody>
        {entries.map((entry) => (
          <ChangelogEntryBlock key={entry.data.version} entry={entry} />
        ))}
      </DocsBody>
    </DocsPage>
  );
}
