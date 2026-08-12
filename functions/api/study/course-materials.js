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

function rowToItem(row) {
  return {
    sourceId: row.source_id,
    parentSourceId: row.source_id.replace(/:(summary|transcript|notes)$/, ''),
    title: row.title,
    recordedAt: row.recorded_at || row.received_at,
    text: row.transcript || '',
    summary: row.summary || '',
    kind: row.transcript ? 'transcript' : 'summary',
    classId: row.class_id || 'unassigned',
  };
}

export async function onRequestGet({ request, env }) {
  if (!hasStudyAccess(request)) {
    return json({ ok: false, message: 'Study access required.', items: [] }, { status: 401 });
  }

  if (!env.STUDY_DB) {
    return json({ ok: true, source: 'local-only', items: [] });
  }

  const url = new URL(request.url);
  const classId = String(url.searchParams.get('classId') || '').trim();
  if (!classId) {
    return json({ ok: false, message: 'A class is required.', items: [] }, { status: 400 });
  }

  const result = await env.STUDY_DB.prepare(`
    SELECT source_id, title, recorded_at, summary, transcript, received_at, class_id
    FROM study_transcripts
    WHERE class_id = ?
    ORDER BY recorded_at DESC, received_at DESC
    LIMIT 200
  `).bind(classId).all();

  return json({
    ok: true,
    source: 'cloudflare-d1',
    count: result.results?.length || 0,
    items: (result.results || []).map(rowToItem),
  });
}
