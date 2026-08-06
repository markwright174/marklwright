const DEFAULT_MODEL = '@cf/ibm-granite/granite-4.0-h-micro';
const DAILY_REQUEST_LIMIT = 25;
const MAX_QUESTION_CHARS = 700;
const MAX_CONTEXT_CHARS = 4500;
const MAX_COMPLETION_TOKENS = 450;

function json(data, init = {}) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
    ...init,
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cleanText(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function getUsage(env, usageDate) {
  if (!env.STUDY_DB) return { request_count: 0 };
  const row = await env.STUDY_DB.prepare(
    'SELECT request_count FROM study_ai_usage WHERE usage_date = ?',
  ).bind(usageDate).first();
  return row || { request_count: 0 };
}

async function incrementUsage(env, usageDate) {
  if (!env.STUDY_DB) return;
  await env.STUDY_DB.prepare(`
    INSERT INTO study_ai_usage (usage_date, request_count, updated_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(usage_date) DO UPDATE SET
      request_count = request_count + 1,
      updated_at = CURRENT_TIMESTAMP
  `).bind(usageDate).run();
}

function getModeInstruction(mode) {
  switch (mode) {
    case 'coach':
      return 'Coach the student with hints, questions, and a next step. Do not give a final answer unless it is needed to explain a concept.';
    case 'steps':
      return 'Break the problem or question into clear next steps. Stop short of completing the whole assignment.';
    case 'check':
      return 'Check the student\'s thinking. Point out what seems right, what needs another look, and one useful next step.';
    case 'quiz':
      return 'Ask 3-5 short review questions. Do not provide answers unless the student asks.';
    case 'explain':
      return 'Explain the selected material clearly for an advanced 8th grade student. Use short sections.';
    case 'terms':
      return 'Find the most important terms or ideas and explain each in one sentence.';
    case 'audio':
      return 'Create a short audio-review script that could be read aloud in under two minutes.';
    case 'find':
      return 'Answer by locating relevant information in the provided study context. Say when the context does not include the answer.';
    default:
      return 'Help with the provided study context. Keep the answer short and useful.';
  }
}

function getAiText(result) {
  if (typeof result?.response === 'string') return result.response;
  if (typeof result?.result?.response === 'string') return result.result.response;
  if (typeof result?.choices?.[0]?.message?.content === 'string') return result.choices[0].message.content;
  if (Array.isArray(result?.choices) && typeof result.choices[0]?.text === 'string') return result.choices[0].text;
  return 'I could not create a study response from that request.';
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return json(
      {
        ok: false,
        code: 'AI_NOT_BOUND',
        message: 'Workers AI is not bound to this Pages project yet.',
      },
      { status: 501 },
    );
  }

  const usageDate = todayKey();
  const usage = await getUsage(env, usageDate);
  if (usage.request_count >= DAILY_REQUEST_LIMIT) {
    return json(
      {
        ok: false,
        code: 'DAILY_LIMIT_REACHED',
        message: 'The study helper has reached today\'s free-use limit. Try again tomorrow.',
        limit: DAILY_REQUEST_LIMIT,
        used: usage.request_count,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const question = cleanText(body.question, MAX_QUESTION_CHARS);
  const mode = cleanText(body.mode || 'help', 40);
  const scope = cleanText(body.scope || 'recording', 40);
  const contextTitle = cleanText(body.contextTitle, 180);
  const contextSummary = cleanText(body.contextSummary, MAX_CONTEXT_CHARS / 2);
  const contextText = cleanText(body.contextText, MAX_CONTEXT_CHARS);

  if (scope === 'general' && !question) {
    return json(
      {
        ok: false,
        code: 'QUESTION_REQUIRED',
        message: 'Ask a question or choose a study action first.',
      },
      { status: 400 },
    );
  }

  const model = env.STUDY_AI_MODEL || DEFAULT_MODEL;
  const hasContext = Boolean(contextTitle || contextSummary || contextText);
  const scopeInstruction = scope === 'general'
    ? [
      'This request may be a general homework, reading, math, or study question.',
      hasContext
        ? 'Use the provided context first. If outside knowledge is useful, keep it basic and mark it as general background.'
        : 'Use general middle-school appropriate knowledge, but coach the student instead of simply giving the answer.',
      'For math or homework problems, prefer a hint, setup, or first step before any final answer.',
    ].join(' ')
    : 'Use only the provided study context. If the answer is not in the context, say so.';
  const messages = [
    {
      role: 'system',
      content: [
        'You are Lily\'s lightweight study helper.',
        'Lily is an advanced 8th grade student with ADHD and dysgraphia.',
        'Help her understand, remember, and study. Do not write assignments for her.',
        scopeInstruction,
        'Keep responses concise, warm, and practical.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Study action: ${getModeInstruction(mode)}`,
        contextTitle ? `Recording: ${contextTitle}` : '',
        contextSummary ? `Summary:\n${contextSummary}` : '',
        contextText ? `Transcript/context:\n${contextText}` : '',
        question ? `Student question:\n${question}` : 'Student question: Use the selected study action.',
      ].filter(Boolean).join('\n\n'),
    },
  ];

  const result = await env.AI.run(model, {
    messages,
    max_tokens: MAX_COMPLETION_TOKENS,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    temperature: 0.3,
  });

  await incrementUsage(env, usageDate);
  const newUsage = usage.request_count + 1;

  return json({
    ok: true,
    model,
    answer: getAiText(result),
    usage: {
      date: usageDate,
      used: newUsage,
      limit: DAILY_REQUEST_LIMIT,
      remaining: Math.max(DAILY_REQUEST_LIMIT - newUsage, 0),
    },
  });
}

export async function onRequestGet({ env }) {
  const usageDate = todayKey();
  const usage = await getUsage(env, usageDate);
  return json({
    ok: true,
    model: env.STUDY_AI_MODEL || DEFAULT_MODEL,
    usage: {
      date: usageDate,
      used: usage.request_count,
      limit: DAILY_REQUEST_LIMIT,
      remaining: Math.max(DAILY_REQUEST_LIMIT - usage.request_count, 0),
    },
  });
}
