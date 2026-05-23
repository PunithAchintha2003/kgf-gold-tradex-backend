import { AppError } from '../utils/AppError.js';

const SYSTEM_PROMPT = `You are KGF Assist, the official AI customer support assistant for KGF Gold TradeX — Sri Lanka's digital gold marketplace.

Help users with:
- Buying gold jewelry and using the product catalog
- Live auctions and bidding
- Spot gold trading, deposits, and withdrawals (LKR)
- AR try-on for jewelry
- Account registration, login, and verification
- Navigating the website and mobile experience

Guidelines:
- Be concise, professional, and friendly
- Use LKR for currency unless the user specifies otherwise
- Do not provide personalized investment or financial advice
- For account-specific balances, orders, or auction wins, tell users to sign in or use the Merchants chat tab after winning an auction
- If unsure, suggest signing in or contacting the merchant for order issues
- Never invent order IDs, balances, or policies`;

const MAX_MESSAGES = 24;
const MAX_CONTENT_LENGTH = 2000;

const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-pro',
];

function resolveProvider() {
  const explicit = (process.env.SUPPORT_AI_PROVIDER || '').trim().toLowerCase();
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (explicit === 'openai' && hasOpenAI) return 'openai';
  if (explicit === 'gemini' && hasGemini) return 'gemini';
  if (hasOpenAI) return 'openai';
  if (hasGemini) return 'gemini';
  return null;
}

function geminiModelsToTry() {
  const configured = process.env.GEMINI_MODEL?.trim();
  const list = configured ? [configured, ...GEMINI_MODEL_FALLBACKS] : [...GEMINI_MODEL_FALLBACKS];
  return [...new Set(list)];
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new AppError('messages must be an array', 400);
  }

  const sanitized = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').trim().slice(0, MAX_CONTENT_LENGTH),
    }))
    .filter((m) => m.content.length > 0);

  if (sanitized.length === 0) {
    throw new AppError('At least one message is required', 400);
  }

  const last = sanitized[sanitized.length - 1];
  if (last.role !== 'user') {
    throw new AppError('Last message must be from the user', 400);
  }

  return sanitized.slice(-MAX_MESSAGES);
}

/** Gemini requires alternating user/model turns; merge consecutive same-role messages. */
function normalizeGeminiContents(messages) {
  const merged = [];
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const last = merged[merged.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${msg.content}`;
    } else {
      merged.push({ role, parts: [{ text: msg.content }] });
    }
  }
  if (merged.length === 0 || merged[0].role !== 'user') {
    merged.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
  }
  return merged;
}

async function chatOpenAI(messages, userName) {
  const apiKey = process.env.OPENAI_API_KEY.trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const baseUrl = (process.env.OPENAI_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, '');

  const system = userName
    ? `${SYSTEM_PROMPT}\n\nThe signed-in user's name is ${userName}.`
    : SYSTEM_PROMPT;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.4,
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 1024,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error || `OpenAI request failed (${res.status})`;
    throw new AppError(String(errMsg), 502);
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new AppError('Empty response from AI', 502);
  return { reply, provider: 'openai', model };
}

async function requestGeminiModel(model, apiKey, apiBase, payload) {
  const url = `${apiBase}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, model };
}

async function chatGemini(messages, userName) {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  const apiBase = (
    process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta'
  ).replace(/\/$/, '');

  const system = userName
    ? `${SYSTEM_PROMPT}\n\nThe signed-in user's name is ${userName}.`
    : SYSTEM_PROMPT;

  const contents = normalizeGeminiContents(messages);
  const useV1Beta = apiBase.includes('v1beta');

  const payload = {
    contents,
    generationConfig: {
      temperature: Number(process.env.GEMINI_TEMPERATURE) || 0.4,
      maxOutputTokens: Math.min(Number(process.env.GEMINI_MAX_TOKENS) || 1024, 8192),
    },
  };

  if (useV1Beta) {
    payload.systemInstruction = { parts: [{ text: system }] };
  } else if (contents[0]?.parts?.[0]) {
    contents[0].parts[0].text = `${system}\n\n${contents[0].parts[0].text}`;
  }

  const modelsToTry = geminiModelsToTry();
  let lastError = 'Gemini request failed';

  for (const model of modelsToTry) {
    const { res, data } = await requestGeminiModel(model, apiKey, apiBase, payload);

    if (res.ok) {
      const reply = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('')
        .trim();

      if (reply) {
        return { reply, provider: 'gemini', model };
      }
      lastError = 'Empty response from AI';
      continue;
    }

    const apiMessage = data?.error?.message || `Gemini request failed (${res.status})`;

    if (res.status === 429 || String(apiMessage).toLowerCase().includes('quota')) {
      lastError =
        'AI support is temporarily rate-limited. Please try again in a minute.';
      continue;
    }

    lastError = apiMessage;

    const retryable =
      res.status === 404 ||
      res.status === 400 ||
      String(apiMessage).toLowerCase().includes('not found') ||
      String(apiMessage).toLowerCase().includes('not supported');

    if (!retryable) {
      throw new AppError(
        'AI support is temporarily unavailable. Please try again later.',
        502
      );
    }
  }

  const isQuota = String(lastError).toLowerCase().includes('rate-limited');
  throw new AppError(
    isQuota
      ? lastError
      : 'AI support is temporarily unavailable. Please try again later.',
    isQuota ? 503 : 502
  );
}

export function isSupportAiConfigured() {
  return resolveProvider() !== null;
}

export async function generateSupportReply(messages, { userName } = {}) {
  const provider = resolveProvider();
  if (!provider) {
    throw new AppError(
      'AI support is not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the server.',
      503
    );
  }

  const sanitized = sanitizeMessages(messages);

  if (provider === 'openai') {
    return chatOpenAI(sanitized, userName);
  }
  return chatGemini(sanitized, userName);
}
