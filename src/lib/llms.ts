import { toAbsoluteDocsLink } from './llms-core';

const docsLlmsPreamble = `# mosoo Docs

> Product and developer documentation for building, publishing, operating, and integrating mosoo Agents.

## Direct answers

- What is mosoo? mosoo is an open-source Agent runtime and API for coding agents. It provides durable Threads, Runs, files, sandboxed execution, tool events, and API access around published Agents.
- How does a product call an Agent? Publish the Agent, create a Project API key (msp_) in the same Project, keep it on a trusted backend, create a Thread with an application userId, send user events, and read or stream Thread events. Legacy account tokens are rejected.
- What runtime concepts matter? Projects isolate Agents, configuration resources, files, and usage. Agents define behavior and runtime, Threads keep durable user work, and Runs execute a published Agent version.
- How do I self-host mosoo? Deploy the open-source stack on Cloudflare Workers with the documented GitHub Actions or local Wrangler flow, then configure your model provider credentials.
- Where are the exact API schemas? Use the API reference and its OpenAPI 3.1 contract. The Public Thread API interacts with published Agents; it does not create, configure, or publish Agents.

## Start here

- [Product tour](https://mosoo.ai/docs/product-tour/)
- [Create your first Agent](https://mosoo.ai/docs/first-agent/)
- [Publish and API access](https://mosoo.ai/docs/publish-and-api-access/)
- [API quickstart](https://mosoo.ai/docs/quickstart/)
- [Authentication and Project API keys](https://mosoo.ai/docs/auth-and-access/)
- [API reference](https://mosoo.ai/docs/api-reference/)
- [OpenAPI 3.1](https://cloud.mosoo.ai/api/v1/openapi.json)
- [Deploy mosoo on Cloudflare](https://mosoo.ai/docs/deploy-mosoo/)
- [Errors and limits](https://mosoo.ai/docs/errors-and-limits/)
- [Complete documentation](https://mosoo.ai/docs/llms-full.txt)`;

export function buildDocsLlmsIndex(generatedIndex: string) {
  // Fumadocs generates this navigation list without code blocks or inline examples.
  const pageIndex = generatedIndex
    .replace(/^# /gm, '### ')
    .replace(/\]\((\/docs[^\s)]*)\)/g, (_match, href: string) => `](${toAbsoluteDocsLink(href)})`);
  return `${docsLlmsPreamble}\n\n## Page index\n\n${pageIndex.trim()}\n`;
}
