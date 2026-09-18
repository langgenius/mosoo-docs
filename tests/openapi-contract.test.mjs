import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = new URL('..', import.meta.url);

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), 'utf8');
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test('create Thread snapshots expose the exact runtime request contract', () => {
  const openApiText = read('public/docs/openapi/mosoo-openapi.en.generated.json');
  const openApi = JSON.parse(openApiText);
  const schema = openApi.components.schemas.CreateThreadRequest;
  const operation = openApi.paths['/agents/{agentId}/threads'].post;

  assert.deepEqual(Object.keys(schema.properties).sort(), ['input', 'resources', 'userId']);
  assert.deepEqual(schema.required, ['userId']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(operation.requestBody.required, true);

  for (const example of Object.values(operation.requestBody.content['application/json'].examples)) {
    assert.equal(typeof example.value.userId, 'string');
    assert.ok(example.value.userId.length > 0);
  }
});

test('published guides and snapshots contain no retired request field names', () => {
  const publicInputs = [
    ...walk(fileURLToPath(new URL('content/docs', root))),
    ...walk(fileURLToPath(new URL('public/docs/openapi', root))),
  ];

  for (const path of publicInputs) {
    const content = readFileSync(path, 'utf8');
    assert.doesNotMatch(content, /client_external_ref|clientRequestId/, path);
  }
});

test('PR and deploy workflows block stale canonical OpenAPI', () => {
  assert.match(read('.github/workflows/check.yml'), /npm run openapi:check/);
  assert.match(read('.github/workflows/deploy.yml'), /npm run openapi:check/);
});

test('OpenAPI provenance binds the normalized snapshot to upstream Mosoo', () => {
  const openApiText = read('public/docs/openapi/mosoo-openapi.en.generated.json');
  const provenance = JSON.parse(read('public/docs/openapi/mosoo-openapi.provenance.json'));

  assert.equal(
    provenance.normalizedOpenApiSha256,
    createHash('sha256').update(openApiText).digest('hex'),
  );
  assert.equal(provenance.upstreamRepository, 'https://github.com/langgenius/mosoo');
  assert.match(provenance.upstreamSha, /^[0-9a-f]{40}$/);
});


test('v2 snapshots retain optional identity, usage semantics and independent doc IDs', () => {
  for (const language of ['en', 'zh-Hans', 'ja']) {
    const document = JSON.parse(read(`public/docs/openapi/mosoo-openapi.v2.${language}.generated.json`));
    const create = document.paths['/agents/{agentId}/threads'].post;
    assert.equal(create.requestBody.required, false);
    assert.deepEqual(document.components.schemas.CreateThreadRequest.required, []);
    assert.deepEqual(document.components.schemas.ThreadSummary.properties.userId.type, ['string', 'null']);
    const usage = document.paths['/threads/{threadId}/usage'].get;
    assert.ok(usage.parameters.some((parameter) => parameter.name === 'after'));
    const entry = document.components.schemas.ThreadUsageResponse.properties.usage.items;
    assert.deepEqual(entry.properties.reportedCostUsd.type, ['number', 'null']);
    assert.match(read(`content/docs/${language}/api-reference-v2/read-thread-usage.mdx`), new RegExp(`document="${language}-v2"`));
    assert.ok(read(`content/docs/${language}/api-reference/index.mdx`).length > 0);
  }
  const provenance = JSON.parse(read('public/docs/openapi/mosoo-openapi.provenance.json'));
  assert.equal(provenance.normalizedOpenApiV2Sha256, createHash('sha256').update(read('public/docs/openapi/mosoo-openapi.v2.en.generated.json')).digest('hex'));
});

test('per-turn budgets are optional in v2 and do not widen the v1 contract', () => {
  for (const language of ['en', 'zh-Hans', 'ja']) {
    const v1 = JSON.parse(read(`public/docs/openapi/mosoo-openapi.${language}.generated.json`));
    const v2 = JSON.parse(read(`public/docs/openapi/mosoo-openapi.v2.${language}.generated.json`));
    for (const schemaName of ['CreateThreadRequest', 'SendEventsRequest']) {
      assert.equal(Object.hasOwn(v1.components.schemas[schemaName].properties, 'maxCostUsd'), false);
      const request = v2.components.schemas[schemaName];
      assert.equal(request.properties.maxCostUsd.type, 'number');
      assert.equal(request.properties.maxCostUsd.minimum, 0.000001);
      assert.equal(request.required.includes('maxCostUsd'), false);
      assert.equal(Object.hasOwn(request.properties.maxCostUsd, 'default'), false);
    }
    assert.equal(Object.hasOwn(v1.components.schemas.RunSummary.properties, 'budget'), false);
    const run = v2.components.schemas.RunSummary;
    assert.equal(run.required.includes('budget'), false);
    const budget = run.properties.budget;
    assert.equal(budget.type, 'object');
    assert.equal(budget.additionalProperties, false);
    assert.deepEqual(budget.required, ['capUsd', 'estimatedCostUsd', 'state']);
    assert.equal(budget.properties.capUsd.type, 'number');
    assert.equal(budget.properties.estimatedCostUsd.type, 'number');
    assert.deepEqual(budget.properties.state.enum, [
      'available', 'settling', 'budget_exhausted', 'budget_usage_unavailable',
    ]);
  }
});
