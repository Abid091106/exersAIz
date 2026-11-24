import { LM, visible, sideAveragedAngle } from './geometry.js';

/**
 * Each exercise turns a pose into one number (`measure`) and says which
 * values count as the "down" and "up" halves of a rep. The RepCounter does
 * the rest. Thresholds are starting points — tune them with real testing.
 *
 * measure(landmarks, aspect) -> number | null  (null = body not visible enough)
 * isDown(v) / isUp(v)        -> reached the bottom / back at the top
 * isPartial(v)               -> started moving down but not far enough (optional)
 */
export const EXERCISES = {
  squat: {
    id: 'squat',
    name: 'Squats',
    emoji: '🦵',
    credits: 2,
    setup: 'Stand side-on or facing the camera, whole body in frame.',
    partialTip: 'Go lower — thighs to about parallel!',
    // Knee angle: ~175° standing, ~90° at the bottom of a good squat.
    measure: (lm, aspect) =>
      sideAveragedAngle(
        lm,
        [LM.L_HIP, LM.L_KNEE, LM.L_ANKLE],
        [LM.R_HIP, LM.R_KNEE, LM.R_ANKLE],
        aspect
      ),
    isDown: (v) => v < 100,
    isUp: (v) => v > 160,
    isPartial: (v) => v < 140,
  },

  pushup: {
    id: 'pushup',
    name: 'Push-ups',
    emoji: '💪',
    credits: 3,
    setup: 'Side-on to the camera so it can see your arm bend.',
    partialTip: 'Lower your chest further!',
    // Elbow angle: ~170° arms locked out, ~80–90° at the bottom.
    measure: (lm, aspect) =>
      sideAveragedAngle(
        lm,
        [LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST],
        [LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST],
        aspect
      ),
    isDown: (v) => v < 95,
    isUp: (v) => v > 155,
    isPartial: (v) => v < 130,
  },

  jumpingJack: {
    id: 'jumpingJack',
    name: 'Jumping jacks',
    emoji: '⭐',
    credits: 1,
    setup: 'Face the camera, whole body in frame.',
    partialTip: 'Hands all the way up, feet out wide!',
    // "Openness" score from 0 (arms down, feet together) to 1 (star shape).
    measure: (lm, aspect) => {
      const ls = lm[LM.L_SHOULDER], rs = lm[LM.R_SHOULDER];
      const lw = lm[LM.L_WRIST], rw = lm[LM.R_WRIST];
      const la = lm[LM.L_ANKLE], ra = lm[LM.R_ANKLE];
      if (!visible(ls, rs, lw, rw, la, ra)) return null;
      const shoulderWidth = Math.abs(ls.x - rs.x) * aspect || 1e-6;
      const shoulderY = (ls.y + rs.y) / 2;
      const wristY = (lw.y + rw.y) / 2;
      // Arms: 0 when wrists are a shoulder-width below shoulders, 1 when a shoulder-width above.
      const arms = clamp01((shoulderY - wristY) / (2 * shoulderWidth) + 0.5);
      // Feet: 0 at shoulder width apart, 1 at 2x shoulder width.
      const feet = clamp01((Math.abs(la.x - ra.x) * aspect) / shoulderWidth - 1);
      return (arms + feet) / 2;
    },
    isDown: (v) => v > 0.8, // "down" = fully open star
    isUp: (v) => v < 0.3, // back to closed
    isPartial: (v) => v > 0.5,
  },
};

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}
