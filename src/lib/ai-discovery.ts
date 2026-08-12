export const AI_CONTENT_SIGNAL = 'ai-train=no, search=yes, ai-input=yes';

export const DOCS_LLM_LINK_HEADER =
  '</docs/llms.txt>; rel="llms-txt", </docs/llms-full.txt>; rel="llms-full-txt"';

export const docsMarkdownHeaders = {
  'Content-Signal': AI_CONTENT_SIGNAL,
  'Content-Type': 'text/markdown; charset=utf-8',
  Link: DOCS_LLM_LINK_HEADER,
} as const;
