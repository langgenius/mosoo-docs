import {
  changelogFeedRoute,
  changelogRoute,
  entryUrl,
  getChangelogEntries,
  siteOrigin,
} from '@/lib/changelog';

export const revalidate = false;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

export async function GET() {
  const entries = getChangelogEntries();
  const items = await Promise.all(
    entries.map(async (entry) => {
      const link = `${siteOrigin}${entryUrl(entry)}`;
      const body = await entry.data.getText('processed');
      const pubDate = new Date(`${entry.data.date}T00:00:00Z`).toUTCString();

      return [
        '    <item>',
        `      <title>${escapeXml(`${entry.data.version}: ${entry.data.title}`)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(`mosoo-changelog-${entry.data.version}`)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        ...entry.data.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        `      <description>${escapeXml(entry.data.description ?? '')}</description>`,
        `      <content:encoded>${cdata(body)}</content:encoded>`,
        '    </item>',
      ].join('\n');
    }),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    '    <title>Mosoo changelog</title>',
    `    <link>${siteOrigin}${changelogRoute}/</link>`,
    `    <atom:link href="${siteOrigin}${changelogFeedRoute}" rel="self" type="application/rss+xml" />`,
    '    <description>A full rundown of Mosoo releases, improvements, and fixes.</description>',
    '    <language>en</language>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
