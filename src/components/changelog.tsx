import { ExternalLink, Rocket, Rss, Sparkles, Wrench } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { getMDXComponents } from '@/components/mdx';
import {
  CHANGELOG_TAGS,
  changelogFeedRoute,
  entryAnchor,
  formatEntryDate,
  releaseUrl,
  type ChangelogEntry,
  type ChangelogTag,
} from '@/lib/changelog';
import { cn } from '@/lib/cn';

const TAG_ICONS: Record<ChangelogTag, typeof Rocket> = {
  'new-release': Rocket,
  improvements: Sparkles,
  fixes: Wrench,
};

/** Small labelled chip; the release tag carries the brand tint, the others stay neutral. */
export function ChangelogTagChip({ tag, className }: { tag: ChangelogTag; className?: string }) {
  const Icon = TAG_ICONS[tag];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-medium leading-4',
        tag === 'new-release'
          ? 'border-[var(--ms-green-200)] bg-[var(--ms-green-50)] text-[var(--ms-green-800)] dark:border-[rgba(111,211,5,0.28)] dark:bg-[rgba(111,211,5,0.1)] dark:text-[var(--ms-green-300)]'
          : 'border-fd-border bg-fd-muted text-fd-muted-foreground',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {CHANGELOG_TAGS[tag].label}
    </span>
  );
}

/** The row under the page description: the tag legend on the left, the feed on the right. */
export function ChangelogToolbar() {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-fd-border pb-6">
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(CHANGELOG_TAGS) as ChangelogTag[]).map((tag) => (
          <ChangelogTagChip key={tag} tag={tag} />
        ))}
      </div>
      <a
        href={changelogFeedRoute}
        className="inline-flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-background px-2.5 py-1.5 text-[13px] font-medium text-fd-foreground no-underline transition-colors hover:bg-fd-accent"
      >
        <Rss className="size-3.5" aria-hidden="true" />
        RSS feed
      </a>
    </div>
  );
}

function scopedHeading(tag: 'h2' | 'h3' | 'h4', anchor: string) {
  const Base = getMDXComponents()[tag] as (props: ComponentProps<'h2'>) => ReactNode;
  return function ScopedHeading({ id, ...props }: ComponentProps<'h2'>) {
    return <Base {...props} id={id ? `${anchor}-${id}` : undefined} />;
  };
}

/**
 * One release on the timeline: the date, tags, and version tag sit in the left
 * column and stay put while the entry scrolls (the changelog block from the
 * GitBook product-updates page); the title and body fill the right column.
 */
export function ChangelogEntryBlock({ entry }: { entry: ChangelogEntry }) {
  const anchor = entryAnchor(entry);
  const MDX = entry.data.body;
  const components = getMDXComponents({
    // Entry bodies use ### for their sections; keep their ids unique per release.
    h2: scopedHeading('h2', anchor),
    h3: scopedHeading('h3', anchor),
    h4: scopedHeading('h4', anchor),
  });

  return (
    <article
      data-version={entry.data.version}
      className="border-t border-fd-border py-10 first:border-t-0 first:pt-4 md:grid md:grid-cols-[168px_minmax(0,1fr)] md:gap-x-10"
    >
      <aside className="mb-4 md:mb-0 md:sticky md:top-24 md:self-start">
        <time dateTime={entry.data.date} className="block text-[14px] text-fd-muted-foreground">
          {formatEntryDate(entry.data.date)}
        </time>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {entry.data.tags.map((tag) => (
            <ChangelogTagChip key={tag} tag={tag} />
          ))}
        </div>
        <a
          href={releaseUrl(entry)}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-1 font-mono text-[12.5px] text-fd-muted-foreground no-underline transition-colors hover:text-fd-foreground"
        >
          {entry.data.version}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </aside>
      <div className="prose min-w-0 max-w-none">
        <h2 id={anchor} className="mt-0 scroll-mt-28 text-[26px] leading-[1.2] tracking-[-0.015em]">
          <a href={`#${anchor}`}>{entry.data.title}</a>
        </h2>
        <MDX components={components} />
      </div>
    </article>
  );
}
