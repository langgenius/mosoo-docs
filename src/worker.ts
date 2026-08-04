import { getDocumentLanguage } from './lib/seo-core';

interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetBinding;
}

interface RewriterElement {
  setAttribute(name: string, value: string): void;
}

declare const HTMLRewriter: {
  new (): {
    on(selector: string, handlers: { element(element: RewriterElement): void }): {
      transform(response: Response): Response;
    };
  };
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'docs.mosoo.ai') {
      url.hostname = 'mosoo.ai';
      if (url.pathname === '/') {
        url.pathname = '/docs/';
      } else if (!url.pathname.startsWith('/docs/')) {
        url.pathname = `/docs${url.pathname}`;
      }

      const lastSegment = url.pathname.split('/').at(-1) ?? '';
      if (!url.pathname.endsWith('/') && !lastSegment.includes('.')) url.pathname += '/';
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === '/docs') {
      url.pathname = '/docs/';
      return Response.redirect(url.toString(), 308);
    }

    if (shouldAddDocsTrailingSlash(url.pathname)) {
      url.pathname += '/';
      return Response.redirect(url.toString(), 308);
    }

    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get('content-type')?.includes('text/html')) return response;

    const language = getDocumentLanguage(url.pathname);
    const headers = new Headers(response.headers);
    headers.set('content-language', language);
    headers.append('link', '</docs/llms.txt>; rel="llms-txt", </docs/llms-full.txt>; rel="llms-full-txt"');
    const localizedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    return new HTMLRewriter()
      .on('html', {
        element(element) {
          element.setAttribute('lang', language);
        },
      })
      .transform(localizedResponse);
  },
};

function shouldAddDocsTrailingSlash(pathname: string) {
  return (
    pathname.startsWith('/docs/') &&
    !pathname.endsWith('/') &&
    !pathname.startsWith('/docs/api/') &&
    !pathname.startsWith('/docs/og/') &&
    !pathname.split('/').some((segment) => segment.includes('.'))
  );
}

export default worker;
