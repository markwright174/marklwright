import { createSessionCookie, passwordMatches } from '../../../src/study-auth.js';

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...headers },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.STUDY_ACCESS_PASSWORD || !env.STUDY_SESSION_SECRET) {
    return json({ ok: false, message: 'Study site is temporarily unavailable.' }, 503);
  }
  const raw = await request.text();
  if (raw.length > 1024) return json({ ok: false, message: 'Request is too large.' }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }
  if (!await passwordMatches(body?.password, env.STUDY_ACCESS_PASSWORD)) {
    return json({ ok: false, message: 'That password did not open the study site.' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': await createSessionCookie(env.STUDY_SESSION_SECRET) });
}
