# mosoo documentation

Product and API documentation for the [mosoo](https://github.com/langgenius/mosoo) open-source agent runtime for coding agents.

The canonical documentation is published at [mosoo.ai/docs](https://mosoo.ai/docs/). It covers configuring, running, publishing, and integrating agents, including the Public Thread API reference.

## Development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/docs/](http://localhost:3000/docs/).

## Verification

```bash
npm run lint
npm run types:check
npm run build
```

## Deployment

Pushes to `main` are verified and deployed to the `mosoo-docs` Cloudflare Worker by GitHub Actions. The production environment is [mosoo.ai/docs](https://mosoo.ai/docs/); `docs.mosoo.ai` redirects to that canonical URL.

For a manual deployment:

```bash
npm run deploy
```

## Related

- [mosoo source](https://github.com/langgenius/mosoo)
- [mosoo website](https://mosoo.ai/)
- [mosoo Cloud](https://cloud.mosoo.ai/)
