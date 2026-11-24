# exersAIz

**Sweat for your screen time.** exersAIz watches you exercise through your webcam, counts your reps with AI pose tracking, and pays you in credits you can spend on rewards.

## How it works

1. Pick an exercise: squats (+2/rep), push-ups (+3/rep) or jumping jacks (+1/rep).
2. Start a workout. Google's MediaPipe Pose model finds 33 body landmarks in every webcam frame, **running entirely in your browser** — no video is uploaded.
3. Each exercise turns the pose into one number (the knee angle for squats, the elbow angle for push-ups, an "openness" score for jumping jacks).
4. A rep counter watches that number go down past one threshold and back up past another. Two thresholds (hysteresis) plus smoothing stop jittery frames counting fake reps, and half-reps trigger form tips like "Go lower!".
5. Credits land in your wallet instantly. Spend them in the rewards shop.

## Run it locally

```bash
npm install
npm run dev     # open the localhost link it prints, then allow camera access
npm test        # rep-counter unit tests
```

Needs Node 18+ and a webcam. The browser only allows camera access on `localhost` or HTTPS.

## Project structure

```
src/
  pose/
    geometry.js        joint-angle maths + landmark indices
    exercises.js       per-exercise measures and thresholds (tune these!)
    RepCounter.js      smoothing + up/down state machine
    usePoseTracker.js  webcam + MediaPipe loop + skeleton drawing
  lib/wallet.js        credits wallet (localStorage)
  components/          Workout, Shop, History screens
```

## Roadmap

- AI coach: a session summary and next-workout suggestion from an LLM
- More exercises and per-user threshold calibration
- Accounts, leaderboards and streaks
- Anti-cheat (e.g. checking body orientation for push-ups)

Built at a hackathon with React, Vite and MediaPipe.
