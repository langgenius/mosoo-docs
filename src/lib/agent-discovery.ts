import { docsContentRoute, docsRoute } from './shared';

export const contentSignal = 'ai-train=no, search=yes, ai-input=yes';
const indexPath = `${docsRoute}/llms.txt`;
const fullPath = `${docsRoute}/llms-full.txt`;

export function isDocsMarkdownPath(pathname: string) {
  return pathname === indexPath || pathname === fullPath ||
    (pathname.startsWith(`${docsContentRoute}/`) && pathname.endsWith('/content.md'));
}

export function docsDiscoveryHeaders(pathname: string, source?: HeadersInit) {
  const headers = new Headers(source);
  const links = [
    '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
    '<https://cloud.mosoo.ai/api/v1/openapi.json>; rel="service-desc"; type="application/json"',
    '</docs/api-reference/>; rel="service-doc"; type="text/html"',
    `<${docsContentRoute}/auth-and-access/content.md>; rel="related"; type="text/markdown"; title="Authentication"`,
  ];

  if (pathname !== indexPath) links.unshift(`<${indexPath}>; rel="describedby"; type="text/markdown"`);
  if (pathname !== fullPath) links.push(`<${fullPath}>; rel="enclosure"; type="text/markdown"`);

  if (isDocsMarkdownPath(pathname)) {
    headers.set('content-type', 'text/markdown; charset=utf-8');
    if (pathname.startsWith(`${docsContentRoute}/`)) {
      const slug = pathname.slice(docsContentRoute.length, -'/content.md'.length);
      links.push(`<${docsRoute}${slug}/>; rel="alternate"; type="text/html"`);
    }
  }

  headers.set('content-signal', contentSignal);
  headers.append('link', links.join(', '));
  return headers;
}
