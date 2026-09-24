import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../workers/lily-notes-email/src/index.js';

test('email diagnostics stay closed without an access secret', async () => {
  const response = await worker.fetch(new Request('https://example.com/diagnostics'), {});
  assert.equal(response.status, 401);
});
