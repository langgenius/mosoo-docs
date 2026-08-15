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

const LEGACY_DOC_REDIRECTS = new Map([
  ['/docs/api-reference/complete-thread-file-upload', '/docs/files/'],
  ['/docs/api-reference/upload-thread-file-content', '/docs/files/'],
  ['/docs/api-reference/create-a-thread-file-upload', '/docs/files/'],
  ['/docs/api-reference/add-a-thread-file', '/docs/files/'],
  ['/docs/zh-Hans/api-reference/complete-thread-file-upload', '/docs/zh-Hans/files/'],
  ['/docs/zh-Hans/api-reference/upload-thread-file-content', '/docs/zh-Hans/files/'],
  ['/docs/zh-Hans/api-reference/create-a-thread-file-upload', '/docs/zh-Hans/files/'],
  ['/docs/zh-Hans/api-reference/add-a-thread-file', '/docs/zh-Hans/files/'],
  ['/docs/api-reference/列出-thread-文件', '/docs/zh-Hans/api-reference/list-thread-files/'],
  ['/docs/api-reference/归档-thread', '/docs/zh-Hans/api-reference/archive-a-thread/'],
  ['/docs/api-reference/读取-thread-摘要', '/docs/zh-Hans/api-reference/retrieve-thread-summary/'],
  ['/docs/api-reference/移除-thread-文件', '/docs/zh-Hans/api-reference/remove-a-thread-file/'],
  [
    '/docs/api-reference/列出-agent-api-endpoint-的-thread',
    '/docs/zh-Hans/api-reference/list-threads-for-an-agent-api-endpoint/',
  ],
  [
    '/docs/api-reference/为-agent-api-endpoint-创建-thread',
    '/docs/zh-Hans/api-reference/create-a-thread-for-an-agent-api-endpoint/',
  ],
  [
    '/docs/api-reference/下载-thread-文件内容',
    '/docs/zh-Hans/api-reference/download-thread-file-content/',
  ],
  [
    '/docs/api-reference/向-thread-发送用户消息、权限决策或中断',
    '/docs/zh-Hans/api-reference/send-user-messages-permission-decisions-or-interrupts-to-a-thread/',
  ],
  ['/docs/api-reference/列出-thread-事件', '/docs/zh-Hans/api-reference/list-thread-events/'],
  ['/docs/api-reference/取消归档-thread', '/docs/zh-Hans/api-reference/unarchive-a-thread/'],
  ['/docs/api-reference/删除-thread', '/docs/zh-Hans/api-reference/delete-a-thread/'],
  ['/docs/api-reference/列出-thread-文件.md', '/docs/zh-Hans/api-reference/list-thread-files/'],
  ['/docs/zh-Hans.md', '/docs/zh-Hans/'],
  ['/docs/threads/{threadId}/unarchive', '/docs/api-reference/unarchive-a-thread/'],
  ['/docs/threads/{threadId}/events', '/docs/api-reference/list-thread-events/'],
]);

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const forceHttps = url.protocol === 'http:';
    const legacyDocsHost = url.hostname === 'docs.mosoo.ai';

    if (forceHttps) url.protocol = 'https:';

    if (legacyDocsHost) {
      url.hostname = 'mosoo.ai';
      if (url.pathname === '/') {
        url.pathname = '/docs/';
      } else if (url.pathname === '/robots.txt') {
        // Keep host-level robots at the domain root; /docs/robots.txt is not a real asset.
        url.pathname = '/robots.txt';
      } else if (!url.pathname.startsWith('/docs/')) {
        url.pathname = `/docs${url.pathname}`;
      }
    }

    const legacyRedirect = getLegacyDocRedirect(url.pathname);
    if (legacyRedirect) {
      url.pathname = legacyRedirect;
      return Response.redirect(url.toString(), 308);
    }

    if (legacyDocsHost) {
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

    if (forceHttps) return Response.redirect(url.toString(), 308);

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

function getLegacyDocRedirect(pathname: string) {
  try {
    return LEGACY_DOC_REDIRECTS.get(decodeURI(pathname.replace(/\/$/, '')));
  } catch {
    return undefined;
  }
}

export default worker;
