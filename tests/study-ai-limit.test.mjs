import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequestPost } from '../functions/api/study/chat.js';

function request() {
  return new Request('https://example.com/api/study/chat', {
    method: 'POST',
    body: JSON.stringify({ question: 'Help me review fractions.', scope: 'general' }),
  });
}

test('AI requests fail closed when the usage database is unavailable', async () => {
  let calls = 0;
  const response = await onRequestPost({
    request: request(),
    env: { AI: { run: async () => { calls += 1; return { response: 'Hint' }; } } },
  });
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});

test('the 26th AI request is rejected before model invocation', async () => {
  let count = 0;
  let calls = 0;
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            async run() {
              if (sql.includes('UPDATE study_ai_usage')) {
                if (count >= 25) return { meta: { changes: 0 } };
                count += 1;
              }
              return { meta: { changes: 1 } };
            },
            async first() { return { request_count: count }; },
          };
        },
      };
    },
  };
  const env = { STUDY_DB: db, AI: { run: async () => { calls += 1; return { response: 'Hint' }; } } };
  for (let index = 0; index < 25; index += 1) {
    const response = await onRequestPost({ request: request(), env });
    assert.equal(response.status, 200);
  }
  const blocked = await onRequestPost({ request: request(), env });
  assert.equal(blocked.status, 429);
  assert.equal(calls, 25);
});
