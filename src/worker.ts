interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetBinding;
}

const worker = {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const url = new URL(request.url);

    if (url.pathname === '/docs') {
      url.pathname = '/docs/';
      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
