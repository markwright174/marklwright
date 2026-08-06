const DEFAULT_ALLOWED_RECIPIENT = 'lily-notes@marklwright.com';

function decodeHeader(value) {
  return String(value || '').replace(/=\?utf-8\?q\?([^?]+)\?=/gi, (_, encoded) => encoded
    .replace(/_/g, ' ')
    .replace(/=([a-f0-9]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16))));
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
  };
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
    summary: summary || cleaned.slice(0, 4000),
    transcript: transcript || cleaned,
    rawText: cleaned,
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
  const bodyText = stripHtml(parsed.body);
  const content = parseStudyContent(bodyText);
  const sourceSeed = [
    parsed.messageId,
    parsed.subject,
    parsed.date,
    bodyText.slice(0, 1000),
  ].filter(Boolean).join('|');

  return {
    sourceId: `email:${await hashSourceId(sourceSeed || crypto.randomUUID())}`,
    title: parsed.subject || 'Plaud class notes',
    recordedAt: parsed.date ? new Date(parsed.date).toISOString() : null,
    summary: content.summary,
    transcript: content.transcript,
    rawText: content.rawText,
    fromEmail: parsed.from || message.from || null,
    receivedAt: new Date().toISOString(),
  };
}

async function storeTranscript(env, item) {
  await env.STUDY_DB.prepare(`
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

export default {
  async email(message, env) {
    const allowedRecipient = (env.ALLOWED_RECIPIENT || DEFAULT_ALLOWED_RECIPIENT).toLowerCase();
    if (message.to.toLowerCase() !== allowedRecipient) {
      message.setReject(`This address only accepts Plaud notes for ${allowedRecipient}.`);
      return;
    }

    if (!env.STUDY_DB) {
      message.setReject('Study transcript database is not configured.');
      return;
    }

    const item = await parseMessage(message);
    if (!shouldStoreMessage(item)) return;
    await storeTranscript(env, item);
  },
};
