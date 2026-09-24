import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequest as protectStudy } from '../functions/_middleware.js';
import { onRequestPost as logIn } from '../functions/api/study/session.js';

const env = {
  STUDY_ACCESS_PASSWORD: 'family-test-phrase',
  STUDY_SESSION_SECRET: 'a-long-independent-test-signing-secret',
};

function context(path, cookie = '') {
  return {
    request: new Request(`https://example.com${path}`, { headers: cookie ? { Cookie: cookie } : {} }),
    env,
    next: async () => new Response('private study page'),
  };
}

test('study pages redirect until a successful login issues a cookie', async () => {
  const before = await protectStudy(context('/study/class-a/'));
  assert.equal(before.status, 302);
  assert.equal(before.headers.get('Location'), '/study/login/?next=%2Fstudy%2Fclass-a%2F');
  assert.equal(before.headers.get('X-Robots-Tag'), 'noindex, nofollow');

  const login = await logIn({
    request: new Request('https://example.com/api/study/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: env.STUDY_ACCESS_PASSWORD }),
    }),
    env,
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=2592000/);

  const after = await protectStudy(context('/study/class-a/', cookie.split(';')[0]));
  assert.equal(after.status, 200);
  assert.equal(await after.text(), 'private study page');
  assert.equal(after.headers.get('Cache-Control'), 'private, no-store');
});

test('a wrong password or missing secrets never grants access', async () => {
  const denied = await logIn({
    request: new Request('https://example.com/api/study/session', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    }),
    env,
  });
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('Set-Cookie'), null);

  const unavailable = await protectStudy({ ...context('/api/study/course-materials'), env: {} });
  assert.equal(unavailable.status, 503);
});

test('an invalid cookie cannot read a study API', async () => {
  const denied = await protectStudy(context('/api/study/course-materials', '__Host-study_session=forged'));
  assert.equal(denied.status, 401);
});
