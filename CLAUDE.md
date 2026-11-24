# Rules for AI assistants working on this repo

## API keys and secrets — non-negotiable

- API keys are for the repo owner's eyes only. Never ask for a key in chat, never read `.env` files, and never print, log or commit a secret.
- Never put a key in frontend code. Everything in `src/` is shipped to the browser, so it is public to every visitor of the live site.
- Anything that needs a key (e.g. an AI coach calling an LLM) must go through a Vercel serverless function in `api/`. The owner enters the key himself in Vercel → Project → Settings → Environment Variables, and the function reads it from `process.env` at runtime.
- `.env` and `.env.*` are gitignored. Only `.env.example` with placeholder values is committed.

## Workflow

- Live site: https://exers-ai-z.vercel.app/ (Vercel redeploys on every push to `main`).
- Ask the owner before pushing.
- Commits use the owner's GitHub noreply email: `265406287+Abid091106@users.noreply.github.com`.
