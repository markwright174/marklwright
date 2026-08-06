const DEFAULT_PLAUD_API_BASE = 'https://api.plaud.ai';
const LILY_PLAUD_SERIAL = '8810B30300523466';
const LOOKBACK_DAYS = 3;
const MAX_IMPORT_ITEMS = 12;
const PLAUD_USER_AGENT = 'Mozilla/5.0 (compatible; MarkLWrightStudyWorkspace/0.1)';

function json(data, init = {}) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
    ...init,
  });
}

function getApiBase(env) {
  return env.PLAUD_API_BASE || DEFAULT_PLAUD_API_BASE;
}

function getSinceDate() {
  const date = new Date();
  date.setDate(date.getDate() - LOOKBACK_DAYS);
  return date;
}

function isRecentRecording(recording) {
  const value = recording?.start_at || recording?.created_at || recording?.edit_time;
  if (!value) return true;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) || time >= getSinceDate();
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function plaudFetch(env, path, token, init = {}) {
  const url = new URL(path, getApiBase(env));
  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': PLAUD_USER_AGENT,
      ...(init.headers || {}),
    },
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`Plaud HTTP ${response.status}: ${body.msg || response.statusText}`);
  }
  if (typeof body.status === 'number' && body.status !== 0) {
    throw new Error(`Plaud API ${body.status}: ${body.msg || 'Request failed'}`);
  }
  return body;
}

async function listWorkspaces(env, userToken) {
  return plaudFetch(
    env,
    '/team-app/workspaces/list?need_personal_workspace=true',
    userToken,
  );
}

function pickWorkspaceId(workspacesResponse, configuredWorkspaceId) {
  if (configuredWorkspaceId) return configuredWorkspaceId;
  const workspaces = workspacesResponse?.data?.workspaces || [];
  const personal = workspaces.find((workspace) => workspace.workspace_type === '0');
  return (personal || workspaces[0])?.workspace_id;
}

async function getWorkspaceToken(env, userToken) {
  const workspacesResponse = await listWorkspaces(env, userToken);
  const workspaceId = pickWorkspaceId(workspacesResponse, env.PLAUD_WORKSPACE_ID);
  if (!workspaceId) {
    throw new Error('No Plaud workspace was available for this account.');
  }

  const tokenResponse = await plaudFetch(
    env,
    `/user-app/auth/workspace/token/${encodeURIComponent(workspaceId)}`,
    userToken,
    { method: 'POST', body: '{}' },
  );
  const workspaceToken = tokenResponse?.data?.workspace_token;
  if (!workspaceToken) {
    throw new Error('Plaud did not return a workspace token.');
  }
  return workspaceToken;
}

async function listRecordings(env, workspaceToken) {
  const params = new URLSearchParams({
    skip: '0',
    limit: '100',
    is_trash: '0',
    sort_by: 'edit_time',
    is_desc: 'true',
  });
  const body = await plaudFetch(env, `/file/simple/web?${params}`, workspaceToken);
  return body.data_file || body.data?.files || body.data?.list || body.files || [];
}

function getRecordingId(recording) {
  return recording.id || recording.file_id || recording.fileId;
}

function getRecordingSerial(recording) {
  return recording.serial_number || recording.device_serial_number || recording.device?.serial_number;
}

function getRecordingTitle(recording) {
  return recording.name || recording.filename || recording.title || 'Plaud recording';
}

function getRecordingDate(recording) {
  return recording.start_at || recording.created_at || recording.edit_time || null;
}

function selectContentItems(detail) {
  const items = detail?.data?.content_list || detail?.content_list || detail?.source_list || [];
  let transcript;
  let summary;
  let fallbackSummary;

  for (const item of items) {
    const type = String(item.data_type || '').toLowerCase();
    const id = String(item.data_id || '');
    const isTranscript = type === 'transaction' || type === 'transcript' || id.startsWith('source_transaction:');
    const isSummary = ['auto_sum_note', 'sum_multi_note', 'summary', 'note', 'ai_summary'].includes(type)
      || id.startsWith('auto_sum:')
      || id.startsWith('sum_multi:');

    if (!transcript && isTranscript) {
      transcript = item;
    } else if (isSummary) {
      if (!summary && (type === 'auto_sum_note' || id.startsWith('auto_sum:'))) {
        summary = item;
      } else if (!fallbackSummary) {
        fallbackSummary = item;
      }
    }
  }

  return { transcript, summary: summary || fallbackSummary };
}

function parsePossiblyJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function fetchContent(item) {
  if (!item) return '';
  if (typeof item.data_content === 'string' && item.data_content.trim()) {
    return parsePossiblyJson(item.data_content);
  }
  if (!item.data_link) return '';
  const response = await fetch(item.data_link);
  if (!response.ok) return '';
  const text = await response.text();
  return parsePossiblyJson(text);
}

function flattenTranscript(raw) {
  const segments = Array.isArray(raw)
    ? raw
    : raw?.segments || raw?.transcript || raw?.data || [];
  if (!Array.isArray(segments)) {
    return typeof raw === 'string' ? raw.trim() : '';
  }

  return segments
    .map((segment) => {
      const content = String(segment.content || segment.text || '').trim();
      if (!content) return '';
      const speaker = segment.speaker;
      return speaker ? `${speaker}: ${content}` : content;
    })
    .filter(Boolean)
    .join('\n');
}

function flattenSummary(raw) {
  if (typeof raw === 'string') return raw.trim();
  if (!raw || typeof raw !== 'object') return '';
  return String(raw.ai_content || raw.summary || raw.content || raw.text || '').trim();
}

async function getRecordingItem(env, workspaceToken, recording) {
  const sourceId = getRecordingId(recording);
  const detail = await plaudFetch(env, `/file/detail/${encodeURIComponent(sourceId)}`, workspaceToken);
  const selected = selectContentItems(detail);
  const transcriptRaw = await fetchContent(selected.transcript);
  const summaryRaw = await fetchContent(selected.summary);
  const text = flattenTranscript(transcriptRaw);
  const summary = flattenSummary(summaryRaw);

  return {
    sourceId,
    title: getRecordingTitle(recording),
    recordedAt: getRecordingDate(recording),
    text,
    summary,
  };
}

async function getPlaudItems(env) {
  const userToken = env.PLAUD_USER_TOKEN;
  if (!userToken) {
    return {
      ok: false,
      status: 501,
      body: {
        ok: false,
        code: 'PLAUD_TOKEN_MISSING',
        message: 'Plaud import is wired, but PLAUD_USER_TOKEN has not been added to Cloudflare yet.',
        expectedDeviceSerial: LILY_PLAUD_SERIAL,
        items: [],
      },
    };
  }

  const workspaceToken = await getWorkspaceToken(env, userToken);
  const recordings = await listRecordings(env, workspaceToken);
  const matching = recordings
    .filter((recording) => getRecordingSerial(recording) === LILY_PLAUD_SERIAL)
    .filter(isRecentRecording)
    .slice(0, MAX_IMPORT_ITEMS);

  const items = [];
  for (const recording of matching) {
    try {
      const sourceId = getRecordingId(recording);
      if (!sourceId) continue;
      const item = await getRecordingItem(env, workspaceToken, recording);
      if (item.text || item.summary) items.push(item);
    } catch (error) {
      console.warn('Skipping Plaud recording import:', error instanceof Error ? error.message : error);
    }
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      expectedDeviceSerial: LILY_PLAUD_SERIAL,
      count: items.length,
      items,
    },
  };
}

export async function onRequestPost({ env }) {
  try {
    const result = await getPlaudItems(env);
    return json(result.body, { status: result.status });
  } catch (error) {
    return json(
      {
        ok: false,
        code: 'PLAUD_IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Plaud import failed.',
        expectedDeviceSerial: LILY_PLAUD_SERIAL,
        items: [],
      },
      { status: 502 },
    );
  }
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    service: 'study-transcript-import',
    status: env.PLAUD_USER_TOKEN ? 'plaud-token-configured' : 'waiting-for-plaud-token',
    expectedDeviceSerial: LILY_PLAUD_SERIAL,
  });
}
