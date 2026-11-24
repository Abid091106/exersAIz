// Vercel serverless function: POST /api/coach
// Runs on Vercel's servers, never in the browser, so the API key stays secret.
import { handleCoach } from './_coach.js';

export default async function handler(req, res) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.socket?.remoteAddress;

  const { status, body } = await handleCoach({
    method: req.method,
    body: typeof req.body === 'string' ? safeParse(req.body) : req.body,
    ip,
    env: process.env,
  });
  res.status(status).json(body);
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
