# exersAIz

**Sweat for your screen time.** exersAIz watches you exercise through your webcam, counts your reps with AI pose tracking, and pays you in tokens. Spend them on an AI fitness coach or on rewards.

### ▶️ [Try it live](https://exers-ai-z.vercel.app/)

Works best in Chrome or Edge on a laptop. Allow camera access when asked.

## How it works

1. **Exercise to earn.** Squats (+2 tokens/rep), push-ups (+3) or jumping jacks (+1). You can earn up to **50 tokens a day**; reps still count after that, they just stop paying out until tomorrow.
2. **AI rep counting.** Google's MediaPipe Pose model finds 33 body landmarks in every webcam frame, **running entirely in your browser** — no video is uploaded. Each exercise turns the pose into one number (knee angle, elbow angle, or a jumping-jack "openness" score), and a two-threshold state machine with smoothing counts reps and flags half-reps ("Go lower!").
3. **Spend on the AI coach.** Each message to Coach costs **5 tokens**. Coach is powered by Claude, knows your recent workouts, and sticks to fitness. If it fails to answer, your tokens are refunded.
4. **Or spend on rewards** like screen time or a snack.

## Architecture

```
Browser (React + Vite)                         Vercel serverless
┌─────────────────────────────┐   POST        ┌──────────────────────────┐
│ Webcam → MediaPipe Pose     │  /api/coach   │ api/coach.js             │
│ RepCounter → token wallet   │ ────────────▶ │ validates input,         │
│ Coach chat (5 tokens/msg)   │ ◀──────────── │ per-IP daily limit,      │
└─────────────────────────────┘    reply      │ calls Claude with the    │
                                              │ key from env vars        │
                                              └──────────────────────────┘
```

The API key lives **only** in Vercel's environment variables. It is never in the code, the repo or the browser.

## Run it locally

```bash
npm install
npm run dev     # app only (the coach needs the API below)
npm test        # rep counter, wallet and coach API tests
```

To run the coach locally too, use the Vercel CLI: `npx vercel dev`, with your own key in a `.env.local` file (gitignored — see `.env.example`).

## Project structure

```
api/
  coach.js            Vercel function: POST /api/coach
  _coach.js           coach logic (validation, rate limit, Claude call)
src/
  pose/               geometry, exercise definitions, RepCounter, webcam loop
  lib/wallet.js       token wallet + 50/day earning cap (localStorage)
  components/         Workout, Coach, Shop, History screens
tests/                API tests
```

## Known limitations

- The wallet lives in the browser, so a determined user could edit it. The server-side per-IP limit and a spend cap on the API account stop that from running up costs. Real accounts with a server-side wallet are on the roadmap.

## Roadmap

- Accounts with a server-side wallet, leaderboards and streaks
- More exercises and per-user threshold calibration
- Anti-cheat (e.g. checking body orientation for push-ups)

Built at a hackathon with React, Vite, MediaPipe and Claude.
