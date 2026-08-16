export const appName = 'mosoo Docs';
export const docsRoute = '/docs';
export const docsImageRoute = '/docs/og/docs';
export const docsContentRoute = '/docs/llms.mdx/docs';
export const contentSignal = 'ai-train=no, search=yes, ai-input=yes';
export const docsDiscoveryLinkHeader =
  '</docs/llms.txt>; rel="llms-txt", </docs/llms-full.txt>; rel="llms-full-txt"';
export const docsMarkdownHeaders = {
  'content-signal': contentSignal,
  'content-type': 'text/markdown; charset=utf-8',
  link: docsDiscoveryLinkHeader,
} as const;

export const gitConfig = {
  user: 'langgenius',
  repo: 'mosoo-docs',
  branch: 'main',
};
