const DEFAULT_ALLOWED_RECIPIENT = 'lily-notes@marklwright.com';
const STUDY_ACCESS_HEADER = 'X-Study-Access';

function decodeHeader(value) {
  return String(value || '').replace(/=\?utf-8\?q\?([^?]+)\?=/gi, (_, encoded) => encoded
    .replace(/_/g, ' ')
    .replace(/=([a-f0-9]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16))));
}

function decodeBase64(value) {
  const clean = String(value || '').replace(/\s+/g, '');
  if (!clean) return '';
  try {
    const binary = atob(clean);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function decodeQuotedPrintable(value) {
  return String(value || '')
    .replace(/=\n/g, '')
    .replace(/=([a-f0-9]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function parseRawEmail(rawText) {
  const normalized = rawText.replace(/\r\n/g, '\n');
  const [rawHeaders, ...bodyParts] = normalized.split('\n\n');
  const headers = {};
  let lastKey = null;

  for (const line of rawHeaders.split('\n')) {
    if (/^\s/.test(line) && lastKey) {
      headers[lastKey] += ` ${line.trim()}`;
      continue;
    }
    const index = line.indexOf(':');
    if (index === -1) continue;
    lastKey = line.slice(0, index).trim().toLowerCase();
    headers[lastKey] = line.slice(index + 1).trim();
  }

  return {
    subject: decodeHeader(headers.subject || ''),
    from: headers.from || '',
    date: headers.date || '',
    messageId: headers['message-id'] || '',
    body: bodyParts.join('\n\n'),
    contentType: headers['content-type'] || '',
  };
}

function parsePartHeaders(rawHeaders) {
  const headers = {};
  let lastKey = null;
  for (const line of rawHeaders.split('\n')) {
    if (/^\s/.test(line) && lastKey) {
      headers[lastKey] += ` ${line.trim()}`;
      continue;
    }
    const index = line.indexOf(':');
    if (index === -1) continue;
    lastKey = line.slice(0, index).trim().toLowerCase();
    headers[lastKey] = line.slice(index + 1).trim();
  }
  return headers;
}

function getBoundary(contentType, body) {
  const headerBoundary = contentType.match(/boundary="?([^";]+)"?/i)?.[1];
  if (headerBoundary) return headerBoundary;
  return body.match(/^--([^\n]+)$/m)?.[1]?.trim() || '';
}

function filenameFromDisposition(value) {
  return String(value || '').match(/filename="?([^";]+)"?/i)?.[1] || '';
}

function decodePartBody(body, encoding) {
  const normalizedEncoding = String(encoding || '').toLowerCase();
  if (normalizedEncoding === 'base64') return decodeBase64(body);
  if (normalizedEncoding === 'quoted-printable') return decodeQuotedPrintable(body);
  return body.trim();
}

function parseMimeParts(parsed) {
  const boundary = getBoundary(parsed.contentType, parsed.body);
  if (!boundary) return [];
  return parsed.body
    .split(`--${boundary}`)
    .map((part) => part.trim())
    .filter((part) => part && part !== '--')
    .map((part) => {
      const [rawHeaders, ...bodyParts] = part.split('\n\n');
      const headers = parsePartHeaders(rawHeaders);
      const body = bodyParts.join('\n\n');
      return {
        contentType: headers['content-type'] || '',
        disposition: headers['content-disposition'] || '',
        transferEncoding: headers['content-transfer-encoding'] || '',
        filename: filenameFromDisposition(headers['content-disposition']),
        text: decodePartBody(body, headers['content-transfer-encoding']),
      };
    });
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPlaudText(parsed) {
  const parts = parseMimeParts(parsed);
  const transcript = parts.find((part) => {
    const filename = part.filename.toLowerCase();
    return filename === 'transcript.txt' || filename.includes('transcript') || filename.includes('transcription');
  })?.text || '';
  const summary = parts.find((part) => {
    const filename = part.filename.toLowerCase();
    return filename === 'summary.txt' || filename.includes('summary') || filename.includes('notes');
  })?.text || '';
  const html = parts.find((part) => part.contentType.toLowerCase().includes('text/html'))?.text || '';
  const text = parts.find((part) => part.contentType.toLowerCase().includes('text/plain'))?.text || '';

  return {
    summary,
    transcript,
    bodyText: text || stripHtml(html) || stripHtml(parsed.body),
  };
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function removeQuotedFooter(text) {
  return text
    .split(/\n(?:On .+ wrote:|From: .+|Sent from my|--\s*$)/i)[0]
    .trim();
}

function sectionAfterLabel(text, labels) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*:?\\s*\\n+([\\s\\S]*?)(?=\\n\\s*(?:summary|transcript|transcription|notes|key points|action items)\\s*:?\\s*\\n|$)`, 'i');
  return text.match(pattern)?.[1]?.trim() || '';
}

function parseStudyContent(text) {
  const cleaned = removeQuotedFooter(normalizeText(text));
  const summary = sectionAfterLabel(cleaned, ['Summary', 'Notes', 'Class Notes']);
  const transcript = sectionAfterLabel(cleaned, ['Transcript', 'Transcription']);

  return {
    summary,
    transcript: transcript || cleaned,
    rawText: cleaned,
    hasLabeledSummary: Boolean(summary),
    hasLabeledTranscript: Boolean(transcript),
  };
}

function shouldStoreMessage(item) {
  const title = item.title.toLowerCase();
  const sender = String(item.fromEmail || '').toLowerCase();
  if (sender.includes('notify.cloudflare.com')) return false;
  if (title.includes('verify your email routing address')) return false;
  return true;
}

async function hashSourceId(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function parseMessage(message) {
  const rawText = await new Response(message.raw).text();
  const parsed = parseRawEmail(rawText);
  const plaudText = extractPlaudText(parsed);
  const bodyText = plaudText.bodyText;
  const content = parseStudyContent(bodyText);
  const sourceSeed = [
    parsed.messageId,
    parsed.subject,
    parsed.date,
    bodyText.slice(0, 1000),
  ].filter(Boolean).join('|');

  return {
    sourceId: `email:${await hashSourceId(sourceSeed || crypto.randomUUID())}`,
    messageId: parsed.messageId,
    title: parsed.subject || 'Plaud class notes',
    recordedAt: parsed.date ? new Date(parsed.date).toISOString() : null,
    summary: plaudText.summary || content.summary,
    transcript: plaudText.transcript || content.transcript,
    rawText: content.rawText,
    fromEmail: parsed.from || message.from || null,
    receivedAt: new Date().toISOString(),
    hasSeparateSummary: Boolean(plaudText.summary || content.hasLabeledSummary),
    hasSeparateTranscript: Boolean(plaudText.transcript || content.hasLabeledTranscript),
  };
}

function buildTranscriptRows(item) {
  const rows = [];
  const summary = normalizeText(item.summary);
  const transcript = normalizeText(item.transcript);
  const hasDistinctSummary = item.hasSeparateSummary && summary && summary !== transcript;
  const hasTranscript = transcript && (!hasDistinctSummary || item.hasSeparateTranscript || transcript !== summary);

  if (hasDistinctSummary) {
    rows.push({
      sourceId: `${item.sourceId}:summary`,
      title: `${item.title} - Summary`,
      recordedAt: item.recordedAt,
      summary,
      transcript: '',
      rawText: item.rawText,
      fromEmail: item.fromEmail,
      receivedAt: item.receivedAt,
    });
  }

  if (hasTranscript) {
    rows.push({
      sourceId: `${item.sourceId}:transcript`,
      title: `${item.title} - Transcript`,
      recordedAt: item.recordedAt,
      summary: '',
      transcript,
      rawText: item.rawText,
      fromEmail: item.fromEmail,
      receivedAt: item.receivedAt,
    });
  }

  if (!rows.length && summary) {
    rows.push({
      sourceId: `${item.sourceId}:notes`,
      title: item.title,
      recordedAt: item.recordedAt,
      summary,
      transcript: '',
      rawText: item.rawText,
      fromEmail: item.fromEmail,
      receivedAt: item.receivedAt,
    });
  }

  return rows;
}

async function storeTranscriptRow(env, item) {
  return env.STUDY_DB.prepare(`
    INSERT OR IGNORE INTO study_transcripts
      (source_id, title, recorded_at, summary, transcript, raw_text, from_email, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    item.sourceId,
    item.title,
    item.recordedAt,
    item.summary,
    item.transcript,
    item.rawText,
    item.fromEmail,
    item.receivedAt,
  ).run();
}

async function storeTranscriptItems(env, item) {
  const rows = buildTranscriptRows(item);
  let changes = 0;
  for (const row of rows) {
    const result = await storeTranscriptRow(env, row);
    changes += result?.meta?.changes || 0;
  }
  return { changes, rows };
}

async function logEmailEvent(env, details) {
  if (!env.STUDY_DB) return;
  try {
    await env.STUDY_DB.prepare(`
      INSERT INTO study_email_events
        (event_type, status, source_id, message_id, subject, from_email, to_email, error_detail, summary_length, transcript_length, raw_text_length, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      details.eventType || 'email',
      details.status,
      details.sourceId || null,
      details.messageId || null,
      details.subject || null,
      details.fromEmail || null,
      details.toEmail || null,
      details.errorDetail || null,
      details.summaryLength || 0,
      details.transcriptLength || 0,
      details.rawTextLength || 0,
      details.receivedAt || new Date().toISOString(),
    ).run();
  } catch (error) {
    console.error('Failed to write study email diagnostic event:', error);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/diagnostics') {
      if (request.headers.get(STUDY_ACCESS_HEADER) !== env.STUDY_ACCESS_PASSWORD) {
        return Response.json({ ok: false, message: 'Study access required.' }, { status: 401 });
      }

      if (!env.STUDY_DB) {
        return Response.json({ ok: false, message: 'Study transcript database is not configured.' }, { status: 500 });
      }

      try {
        const result = await env.STUDY_DB.prepare(`
          SELECT status, subject, from_email, to_email, error_detail, summary_length, transcript_length, raw_text_length, received_at
          FROM study_email_events
          ORDER BY received_at DESC
          LIMIT 20
        `).all();

        return Response.json({
          ok: true,
          count: result.results?.length || 0,
          items: result.results || [],
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        console.error('Study diagnostics query failed:', error);
        return Response.json({ ok: false, message: messageText }, { status: 500 });
      }
    }

    return Response.json({
      ok: true,
      service: 'lily-notes-email',
      purpose: 'Receives Plaud AutoFlow emails and saves parsed study notes.',
    });
  },

  async email(message, env) {
    const allowedRecipient = (env.ALLOWED_RECIPIENT || DEFAULT_ALLOWED_RECIPIENT).toLowerCase();
    if (message.to.toLowerCase() !== allowedRecipient) {
      await logEmailEvent(env, {
        status: 'rejected_wrong_recipient',
        fromEmail: message.from || null,
        toEmail: message.to || null,
        errorDetail: `Expected ${allowedRecipient}`,
      });
      message.setReject(`This address only accepts Plaud notes for ${allowedRecipient}.`);
      return;
    }

    if (!env.STUDY_DB) {
      message.setReject('Study transcript database is not configured.');
      return;
    }

    try {
      const item = await parseMessage(message);
      const diagnostic = {
        sourceId: item.sourceId,
        messageId: item.messageId,
        subject: item.title,
        fromEmail: item.fromEmail,
        toEmail: message.to || null,
        summaryLength: item.summary.length,
        transcriptLength: item.transcript.length,
        rawTextLength: item.rawText.length,
        receivedAt: item.receivedAt,
      };

      if (!shouldStoreMessage(item)) {
        await logEmailEvent(env, { ...diagnostic, status: 'skipped_filter' });
        return;
      }

      const result = await storeTranscriptItems(env, item);
      const changes = result.changes;
      await logEmailEvent(env, {
        ...diagnostic,
        status: changes ? 'stored' : 'duplicate_ignored',
        errorDetail: `${result.rows.length} item${result.rows.length === 1 ? '' : 's'} parsed`,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      console.error('Study email worker failed:', error);
      await logEmailEvent(env, {
        status: 'error',
        fromEmail: message.from || null,
        toEmail: message.to || null,
        errorDetail: messageText,
      });
      message.setReject(`Study email worker failed: ${messageText}`);
    }
  },
};
