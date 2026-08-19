import { toCanonicalDocsUrl } from './seo-core';

const docsMarkdownLinkPattern = /\]\((\/docs(?:\/[^\s)#?]*)?)(#[^)]+)?\)/g;

export function canonicalizeDocsMarkdownLinks(markdown: string) {
  return markdown.replace(docsMarkdownLinkPattern, (match, pathname: string, hash = '') => {
    const lastSegment = pathname.split('/').at(-1) ?? '';
    if (lastSegment.includes('.') || pathname.startsWith('/docs/api/')) return match;

    return `](${toCanonicalDocsUrl(pathname)}${hash})`;
  });
}
