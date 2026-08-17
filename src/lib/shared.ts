export const appName = 'mosoo Docs';
export const docsRoute = '/docs';
export const docsImageRoute = '/docs/og/docs';
export const docsContentRoute = '/docs/llms.mdx/docs';
export const docsContentSignal = 'ai-train=no, search=yes, ai-input=yes';
export const docsLlmLinkHeader = '</docs/llms.txt>; rel="llms-txt", </docs/llms-full.txt>; rel="llms-full-txt"';
export const docsLlmHeaders = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'Content-Signal': docsContentSignal,
  Link: docsLlmLinkHeader,
} as const;

export const gitConfig = {
  user: 'langgenius',
  repo: 'mosoo-docs',
  branch: 'main',
};
