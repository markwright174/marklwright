import { hasValidSession } from '../src/study-auth.js';

function protectedResponse(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...headers },
  });
}

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  const isStudyPage = pathname === '/study' || pathname.startsWith('/study/');
  const isStudyApi = pathname.startsWith('/api/study/');
  if (!isStudyPage && !isStudyApi) return context.next();

  const { STUDY_ACCESS_PASSWORD, STUDY_SESSION_SECRET } = context.env;
  if (!STUDY_ACCESS_PASSWORD || !STUDY_SESSION_SECRET) {
    return protectedResponse('Study site is temporarily unavailable.', 503);
  }

  if (pathname === '/study/login' || pathname === '/study/login/' || pathname === '/study/login/index.html'
      || pathname === '/api/study/session') {
    return context.next();
  }

  if (await hasValidSession(context.request.headers.get('Cookie'), STUDY_SESSION_SECRET)) {
    const origin = context.request.headers.get('Origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(context.request.method) && origin && origin !== new URL(context.request.url).origin) {
      return protectedResponse('Forbidden.', 403);
    }
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  if (isStudyApi) {
    return protectedResponse(JSON.stringify({ ok: false, message: 'Study access required.' }), 401, { 'Content-Type': 'application/json' });
  }
  const destination = pathname === '/study' ? '/study/' : pathname;
  return protectedResponse(null, 302, { Location: `/study/login/?next=${encodeURIComponent(destination)}` });
}
