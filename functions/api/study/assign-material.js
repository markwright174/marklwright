const STUDY_ACCESS_CODE = 'lily-study';

function json(data, init = {}) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
    ...init,
  });
}

function hasStudyAccess(request) {
  return request.headers.get('X-Study-Access') === STUDY_ACCESS_CODE;
}

export async function onRequestPost({ request, env }) {
  if (!hasStudyAccess(request)) {
    return json({ ok: false, message: 'Study access required.' }, { status: 401 });
  }

  if (!env.STUDY_DB) {
    return json({ ok: false, message: 'Study database is not configured.' }, { status: 501 });
  }

  const body = await request.json().catch(() => ({}));
  const sourceId = String(body.sourceId || '').trim();
  const classId = String(body.classId || 'unassigned').trim();

  if (!sourceId) {
    return json({ ok: false, message: 'A source item is required.' }, { status: 400 });
  }

  await env.STUDY_DB.prepare(`
    UPDATE study_transcripts
    SET class_id = ?
    WHERE source_id = ?
  `).bind(classId, sourceId).run();

  return json({ ok: true, sourceId, classId });
}
