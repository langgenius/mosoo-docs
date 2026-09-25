# mosoo documentation

Product and API documentation for the [mosoo](https://github.com/langgenius/mosoo) open-source agent runtime for coding agents.

The canonical documentation is published at [mosoo.ai/docs](https://mosoo.ai/docs/). It covers direct harness invocation, durable Sessions, optional Agent presets, and the versioned Public Thread API.

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
npm run openapi:check
npm run build
```

The build also runs `npm run test:assets`: it starts a local Worker with the
exported assets and verifies every article's Markdown alternate, discovery
headers, LLM indexes, and error/HEAD responses. This keeps static-export header
regressions from passing a build that only tested Next route handlers.

## Deployment

Pushes to `main` are verified and deployed to the `mosoo-docs` Cloudflare Worker by GitHub Actions. The production environment is [mosoo.ai/docs](https://mosoo.ai/docs/); `docs.mosoo.ai` redirects to that canonical URL.

Pull requests and deploys regenerate the canonical OpenAPI from `langgenius/mosoo`
and fail when the checked-in snapshots, coding-agent reference, or recorded
upstream SHA/digest are stale. Missing translations explicitly fall back to the
English source text; structural contract drift still blocks publication.

For a manual deployment:

```bash
npm run deploy
```

## Related

- [mosoo source](https://github.com/langgenius/mosoo)
- [mosoo website](https://mosoo.ai/)
- [mosoo Cloud](https://cloud.mosoo.ai/)

## Versioned Session API contracts

OpenAPI synchronization preserves v1 links and generates v2 snapshots and API
pages in sibling `api-reference-v2` directories. Both versions come from one
Mosoo commit; provenance records a separate normalized digest for each.
Synchronization and CI default to the commit in the provenance file. To update
the contract intentionally, set `MOSOO_REPO_REF` to a full upstream commit SHA
and run `npm run openapi:sync`. A local source may be passed as `MOSOO_REPO_DIR`.
The primary quickstarts use Project-scoped v2 direct invocation. Dedicated
quickstart-v1 guides preserve the published-Agent path; durable-sessions-v2
explains continuity and version compatibility. Publication must match the
verified API and CLI release.
