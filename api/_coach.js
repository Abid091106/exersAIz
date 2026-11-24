// Core logic for the AI coach, kept separate from the Vercel handler so it can be unit-tested.
// The API key only ever comes from env (Vercel → Settings → Environment Variables). Never hard-code it.

export const MODEL = 'claude-haiku-5-5';
const MAX_MESSAGES = 10; // conversation history sent to the model
const MAX_CHARS = 800; // per message
const MAX_OUTPUT_TOKENS = 400;
export const IP_DAILY_LIMIT = 15; // 50 tokens/day ÷ 5 per message = 10, plus some slack

const SYSTEM_PROMPT = `You are Coach, the friendly AI fitness coach inside exersAIz — a web app where people do squats, push-ups and jumping jacks in front of their webcam to earn tokens.

How to answer:
- Keep replies short and practical: under 120 words, plain text, at most a few bullet points.
- Only help with fitness: exercise technique and form, workout plans, warm-ups, recovery, motivation, habits, sleep and general healthy-eating basics. If asked about anything else, briefly say you're a fitness coach and steer back to training.
- Use the user's workout stats below when relevant (e.g. praise progress, suggest what to train next).
- You are not a doctor. For pain, injury, dizziness or medical conditions, tell them to stop and see a professional. Never recommend extreme diets, crash dieting or overtraining.

User's workout stats:
`;

/** Turns the stats object the browser sends into safe, short text for the prompt. */
export function describeStats(stats) {
  if (!stats || typeof stats !== 'object') return 'No workouts yet.';
  const num = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Math.min(1e6, Math.floor(Number(x)))) : 0);
  const lines = [`- Tokens earned today: ${num(stats.earnedToday)} of ${num(stats.dailyCap) || 50}`];
  lines.push(`- Lifetime tokens earned: ${num(stats.totalEarned)}`);
  if (stats.reps && typeof stats.reps === 'object') {
    for (const [name, reps] of Object.entries(stats.reps).slice(0, 5)) {
      lines.push(`- ${String(name).slice(0, 30)}: ${num(reps)} reps recently`);
    }
  }
  return lines.join('\n');
}

/** Checks and trims the chat history. Returns null if it's not usable. */
export function cleanMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const cleaned = messages
    .slice(-MAX_MESSAGES)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }))
    .filter((m) => m.content.length > 0);
  // The model expects the conversation to start with the user and end with the user.
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') return null;
  return cleaned;
}

// Best-effort per-IP limit. Serverless instances don't share memory, so this is a speed bump,
// not a guarantee — also set a monthly spend limit in the Anthropic Console.
const usage = new Map();
export function overIpLimit(ip, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const key = `${day}:${ip || 'unknown'}`;
  const count = (usage.get(key) ?? 0) + 1;
  usage.set(key, count);
  if (usage.size > 5000) usage.clear();
  return count > IP_DAILY_LIMIT;
}

/**
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleCoach({ method, body, ip, env, fetchImpl = fetch }) {
  if (method !== 'POST') return { status: 405, body: { error: 'Use POST.' } };

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: 503, body: { error: 'The coach is not set up yet (missing API key on the server).' } };
  }

  const messages = cleanMessages(body?.messages);
  if (!messages) return { status: 400, body: { error: 'Send a message for the coach.' } };

  if (overIpLimit(ip)) {
    return { status: 429, body: { error: "You've hit today's coach limit. Come back tomorrow!" } };
  }

  let res;
  try {
    res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT + describeStats(body?.stats),
        messages,
      }),
    });
  } catch {
    return { status: 502, body: { error: 'Could not reach the AI. Try again in a moment.' } };
  }

  if (!res.ok) {
    // Log the status only — never the request (it contains the key in headers).
    console.error('Anthropic API error', res.status);
    return { status: 502, body: { error: 'The AI is unavailable right now.' } };
  }

  const data = await res.json();
  const reply = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!reply) return { status: 502, body: { error: 'The AI gave an empty answer. Try rephrasing.' } };
  return { status: 200, body: { reply } };
}
