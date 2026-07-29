import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const english = readFileSync(new URL('../content/docs/en/deploy-mosoo.mdx', import.meta.url), 'utf8');
const chinese = readFileSync(
  new URL('../content/docs/zh-Hans/deploy-mosoo.mdx', import.meta.url),
  'utf8',
);

const requiredPreflightCommands = [
  'wrangler d1 migrations apply DB \\\n    --local --env prod --persist-to "$persist_dir"',
  'wrangler d1 migrations list DB --remote --env prod',
  'wrangler queues list',
  'wrangler deploy --env prod --minify --dry-run',
  'wrangler deploy --env prod --dry-run',
];

test('both deployment guides put the non-mutating production preflight before deploy', () => {
  for (const [locale, content] of [
    ['en', english],
    ['zh-Hans', chinese],
  ]) {
    for (const command of requiredPreflightCommands) {
      assert.ok(content.includes(command), `${locale} is missing preflight command: ${command}`);
    }

    const firstDryRun = content.indexOf('wrangler deploy --env prod --minify --dry-run');
    const realDeploy = content.indexOf('\njust deploy\n');
    assert.ok(firstDryRun >= 0 && realDeploy > firstDryRun, `${locale} deploy precedes dry-run`);
    assert.match(content, /first remote (action|operation)|第一个远程操作/);
  }
});

test('deployment guides document callback and Cloudflare permission scope', () => {
  for (const [locale, content] of [
    ['en', english],
    ['zh-Hans', chinese],
  ]) {
    assert.ok(content.includes('/api/auth/callback/google'), `${locale} callback path missing`);
    assert.ok(content.includes('Workers Routes'), `${locale} Workers Routes permission missing`);
    assert.ok(content.includes('Pages'), `${locale} Pages permission missing`);
    assert.doesNotMatch(content, /\bMosoo\b/, `${locale} uses inconsistent brand capitalization`);
  }
});

test('checked-in Chinese API reference matches localized generator output', () => {
  const generated = readFileSync(
    new URL('../content/docs/zh-Hans/api-reference/index.mdx', import.meta.url),
    'utf8',
  );
  assert.match(generated, /title: "API 参考"/);
  for (const heading of ['## 对话', '## 事件', '## 文件']) {
    assert.ok(generated.includes(heading));
  }
});
