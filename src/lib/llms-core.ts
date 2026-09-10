import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { toCanonicalDocsUrl } from './seo-core';

export function toAbsoluteDocsLink(href: string) {
  if (!/^\/docs(?:[/?#]|$)/.test(href)) return href;
  const url = new URL(href, 'https://mosoo.ai');
  const isPage = !url.pathname.split('/').some((segment) => segment.includes('.')) &&
    !/^\/docs\/(?:api|og)(?:\/|$)/.test(url.pathname);
  return (isPage ? toCanonicalDocsUrl(url.pathname) : `${url.origin}${url.pathname}`) +
    url.search + url.hash;
}

type MarkdownNode = Parameters<NonNullable<LLMsOptions['stringify']>>[0];

export function canonicalizeDocsNode(node: MarkdownNode): MarkdownNode {
  if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
    const url = toAbsoluteDocsLink(node.url);
    if (url !== node.url) return { ...node, url };
  }
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    let changed = false;
    const attributes = node.attributes.map((attribute) => {
      if (attribute.type !== 'mdxJsxAttribute' || attribute.name !== 'href' ||
          typeof attribute.value !== 'string') return attribute;
      const value = toAbsoluteDocsLink(attribute.value);
      if (value === attribute.value) return attribute;
      changed = true;
      return { ...attribute, value };
    });
    if (changed) return { ...node, attributes };
  }
  return node;
}

// Rewrite parsed links only in the Markdown export; preserve code and the HTML AST.
export const docsMarkdownOptions: LLMsOptions = {
  stringify(node, parent, state, info) {
    const canonical = canonicalizeDocsNode(node);
    if (canonical !== node) return state.handle(canonical, parent, state, info);
  },
};
