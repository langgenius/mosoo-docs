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
