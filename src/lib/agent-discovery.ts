export const contentSignal = 'ai-train=no, search=yes, ai-input=yes';

export const docsDiscoveryLinkHeader = [
  '</llms.txt>; rel="llms-txt"',
  '</docs/llms.txt>; rel="llms-txt"',
  '</docs/llms-full.txt>; rel="llms-full-txt"',
].join(', ');

export function docsMarkdownHeaders(): HeadersInit {
  return {
    'content-signal': contentSignal,
    'content-type': 'text/markdown; charset=utf-8',
    link: docsDiscoveryLinkHeader,
  };
}
