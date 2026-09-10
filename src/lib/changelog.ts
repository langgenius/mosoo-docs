import { changelog } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { docsRoute } from './shared';

export const changelogRoute = `${docsRoute}/changelog`;
export const changelogFeedRoute = `${changelogRoute}/rss.xml`;
export const siteOrigin = 'https://mosoo.ai';
export const releasesUrl = 'https://github.com/langgenius/mosoo/releases';

export const changelogSource = loader({
  baseUrl: changelogRoute,
  source: changelog.toFumadocsSource(),
});

export type ChangelogEntry = (typeof changelogSource)['$inferPage'];
export type ChangelogTag = ChangelogEntry['data']['tags'][number];

export const CHANGELOG_TAGS: Record<ChangelogTag, { label: string }> = {
  'new-release': { label: 'New release' },
  improvements: { label: 'Improvements' },
  fixes: { label: 'Fixes' },
};

/** Entries newest first; ties (same day) fall back to the higher version. */
export function getChangelogEntries(): ChangelogEntry[] {
  return changelogSource.getPages().sort((a, b) => {
    const byDate = b.data.date.localeCompare(a.data.date);
    return byDate !== 0 ? byDate : b.data.version.localeCompare(a.data.version);
  });
}

/** Stable in-page anchor for a release, e.g. `v0-3-1`. */
export function entryAnchor(entry: ChangelogEntry): string {
  return entry.data.version.replaceAll('.', '-');
}

export function entryUrl(entry: ChangelogEntry): string {
  return `${changelogRoute}/#${entryAnchor(entry)}`;
}

export function releaseUrl(entry: ChangelogEntry): string {
  return `${releasesUrl}/tag/${entry.data.version}`;
}

/** "September 9, 2026" from a YYYY-MM-DD frontmatter date, independent of the build host's zone. */
export function formatEntryDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  });
}
