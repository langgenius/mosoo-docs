const markdownHeaders = {
  'Content-Type': 'text/markdown; charset=utf-8',
};

const docsLlmsPreamble = `# mosoo Docs

> Product and developer documentation for building, publishing, operating, and integrating mosoo Agents.

## Direct answers

- What can I build with mosoo? Use mosoo to configure AI Agents, test them against real tasks, publish stable versions, operate Runs and files, and integrate those Agents through the Public Thread API.
- How does a product call a published mosoo Agent? Publish the Agent with API access, keep the mosoo token on a trusted backend, create or resume a Thread with an application userId, send user events, and read or stream public Thread events.
- What runtime concepts matter? Apps isolate ownership, Agents define behavior and runtime, Threads keep durable user work, Runs execute a published Agent version, and files carry user inputs or Agent artifacts.
- How do I self-host mosoo? Deploy the open-source mosoo stack on Cloudflare Workers with the documented GitHub Actions or local Wrangler flow, then bring your own model provider credentials.
- Where are the exact API schemas? Use the API reference and the OpenAPI 3.1 document for the Public Thread API contract.

## High-value docs

- [Product tour](https://mosoo.ai/docs/product-tour/)
- [Create your first Agent](https://mosoo.ai/docs/first-agent/)
- [Publish and API access](https://mosoo.ai/docs/publish-and-api-access/)
- [API quickstart](https://mosoo.ai/docs/quickstart/)
- [API reference](https://mosoo.ai/docs/api-reference/)
- [Deploy mosoo on Cloudflare](https://mosoo.ai/docs/deploy-mosoo/)
- [Errors and limits](https://mosoo.ai/docs/errors-and-limits/)`;

export function docsMarkdownResponse(body: string) {
  return new Response(body, { headers: markdownHeaders });
}

export function buildDocsLlmsIndex(generatedIndex: string) {
  const pageIndex = generatedIndex.replace(/^#\s+mosoo Docs\s*/, '').trimStart();
  return `${docsLlmsPreamble}

## Page index

${pageIndex}`.trimEnd() + '\n';
}
