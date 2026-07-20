import assert from 'node:assert/strict';
import test from 'node:test';

import { toSeoDescription } from '../scripts/seo-description.mjs';

const streamDescription =
  'Streams public Thread event log entries as Server-Sent Events. Each `thread.event` data payload uses the same ThreadEventLogEntry shape as GET /threads/{threadId}/events. Events are emitted by stable event ID and the stream suppresses duplicate IDs observed during polling.';

test('SEO descriptions truncate on a safe token boundary', () => {
  const description = toSeoDescription(streamDescription);

  assert.equal(
    description,
    'Streams public Thread event log entries as Server-Sent Events. Each `thread.event` data payload uses the same ThreadEventLogEntry shape…',
  );
  assert.ok(description.length <= 160);
  assert.doesNotMatch(description, /\{[^}]*…/);
  assert.equal((description.match(/`/g)?.length ?? 0) % 2, 0);
});
