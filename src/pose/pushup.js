import { LM, visible, angleDeg, sideAveragedAngle } from './geometry.js';

/**
 * Push-up form check with two camera views.
 *
 * Both views produce the same "extension" score: 1 = arms locked out at the
 * top, 0 = chest at the bottom. If the body isn't in a push-up position the
 * reading is null, so that frame can't start or finish a rep.
 *
 * SIDE-ON (stricter) — all three "plank checks" on at least one side:
 *   1. shoulder→hip line within 40° of horizontal
 *   2. wrist lower in the picture than the shoulder (hands on the floor)
 *   3. shoulder→hip→knee at least 140° (body roughly straight; knees allowed
 *      on the floor so knee push-ups count)
 *   …then the score comes from the elbow angle.
 *
 * FRONT-ON (more flexible) — the camera can't judge body straightness, so:
 *   1. both shoulders clearly apart (actually facing the camera) and level
 *   2. both wrists lower than the shoulders (blocks arms-overhead cheats)
 *   3. hips hidden or not clearly below the shoulders (blocks standing arm
 *      curls and kneeling-upright shoulder bobs)
 *   …then the score comes from how far the shoulders drop towards the hands,
 *   measured in shoulder-widths so it works at any distance from the camera.
 */

export const PUSHUP_LIMITS = {
  maxTorsoTilt: 40, // degrees from horizontal
  minBodyLine: 140, // shoulder–hip–knee angle
  elbowBottom: 80, // elbow angle that scores 0
  elbowTop: 160, // elbow angle that scores 1
  minFrontShoulderWidth: 0.08, // fraction of frame height
  frontBottom: 0.6, // shoulder-to-wrist drop (in shoulder widths) that scores 0
  frontTop: 1.4, // …that scores 1
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));

function sidePlankOk(lm, side, aspect) {
  const [s, h, k, w] =
    side === 'left'
      ? [lm[LM.L_SHOULDER], lm[LM.L_HIP], lm[LM.L_KNEE], lm[LM.L_WRIST]]
      : [lm[LM.R_SHOULDER], lm[LM.R_HIP], lm[LM.R_KNEE], lm[LM.R_WRIST]];
  if (!visible(s, h, k, w)) return false;

  const tilt = (Math.atan2(Math.abs(s.y - h.y), Math.abs((s.x - h.x) * aspect)) * 180) / Math.PI;
  if (tilt > PUSHUP_LIMITS.maxTorsoTilt) return false;
  if (w.y <= s.y) return false;
  const line = angleDeg(s, h, k, aspect);
  return line != null && line >= PUSHUP_LIMITS.minBodyLine;
}

function sideReading(lm, aspect) {
  if (!sidePlankOk(lm, 'left', aspect) && !sidePlankOk(lm, 'right', aspect)) return null;
  const elbow = sideAveragedAngle(
    lm,
    [LM.L_SHOULDER, LM.L_ELBOW, LM.L_WRIST],
    [LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST],
    aspect
  );
  if (elbow == null) return null;
  const { elbowBottom, elbowTop } = PUSHUP_LIMITS;
  return { view: 'side', value: clamp01((elbow - elbowBottom) / (elbowTop - elbowBottom)) };
}

function frontReading(lm, aspect) {
  const ls = lm[LM.L_SHOULDER], rs = lm[LM.R_SHOULDER];
  const lw = lm[LM.L_WRIST], rw = lm[LM.R_WRIST];
  if (!visible(ls, rs, lw, rw)) return null;

  const shoulderWidth = Math.abs(ls.x - rs.x) * aspect;
  if (shoulderWidth < PUSHUP_LIMITS.minFrontShoulderWidth) return null; // side-on, not front-on
  if (Math.abs(ls.y - rs.y) > 0.5 * shoulderWidth) return null; // shoulders not level

  const shoulderY = (ls.y + rs.y) / 2;
  if (lw.y <= shoulderY || rw.y <= shoulderY) return null; // a hand is above the shoulders

  // Standing or kneeling upright puts the hips well below the shoulders.
  const hips = [lm[LM.L_HIP], lm[LM.R_HIP]].filter((h) => visible(h));
  if (hips.some((h) => h.y > shoulderY + 0.5 * shoulderWidth)) return null;

  const drop = ((lw.y + rw.y) / 2 - shoulderY) / shoulderWidth;
  const { frontBottom, frontTop } = PUSHUP_LIMITS;
  return { view: 'front', value: clamp01((drop - frontBottom) / (frontTop - frontBottom)) };
}

/** @returns {{view: 'side'|'front', value: number} | null} */
export function pushupReading(lm, aspect = 1) {
  return sideReading(lm, aspect) ?? frontReading(lm, aspect);
}
