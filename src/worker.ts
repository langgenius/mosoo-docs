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

    if (url.pathname === '/docs') {
      url.pathname = '/docs/';
      return Response.redirect(url.toString(), 308);
    }

    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get('content-type')?.includes('text/html')) return response;

    const language = getDocumentLanguage(url.pathname);
    const headers = new Headers(response.headers);
    headers.set('content-language', language);
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

export default worker;
