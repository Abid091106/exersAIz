import { describe, it, expect } from 'vitest';
import { LM } from './geometry.js';
import { pushupReading } from './pushup.js';
import { RepCounter } from './RepCounter.js';
import { EXERCISES } from './exercises.js';

// Build a 33-landmark pose. Unlisted landmarks are invisible. Coordinates are
// normalised (y grows downwards); tests use aspect = 1.
function pose(points) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [idx, [x, y, vis = 1]] of Object.entries(points)) lm[idx] = { x, y, visibility: vis };
  return lm;
}
// Same point for left and right — what a side-on camera roughly sees.
const both = (l, r, p) => ({ [l]: p, [r]: p });
const side = (parts) => {
  const out = {};
  const pairs = {
    shoulder: [LM.L_SHOULDER, LM.R_SHOULDER], elbow: [LM.L_ELBOW, LM.R_ELBOW], wrist: [LM.L_WRIST, LM.R_WRIST],
    hip: [LM.L_HIP, LM.R_HIP], knee: [LM.L_KNEE, LM.R_KNEE], ankle: [LM.L_ANKLE, LM.R_ANKLE],
  };
  for (const [name, p] of Object.entries(parts)) Object.assign(out, both(...pairs[name], p));
  return pose(out);
};

// Repeat each pose for several frames (like video), and count reps.
function countReps(frames, perFrame = 6) {
  const c = new RepCounter(EXERCISES.pushup);
  for (const f of frames) for (let i = 0; i < perFrame; i++) c.update(EXERCISES.pushup.measure(f, 1));
  return c.reps;
}

// --- Real push-ups ---------------------------------------------------------
const sideTop = side({ ankle: [0.1, 0.7], knee: [0.3, 0.68], hip: [0.5, 0.66], shoulder: [0.75, 0.62], elbow: [0.75, 0.735], wrist: [0.75, 0.85] });
const sideMid = side({ ankle: [0.1, 0.72], knee: [0.3, 0.7], hip: [0.5, 0.7], shoulder: [0.75, 0.7], elbow: [0.71, 0.79], wrist: [0.75, 0.85] });
const sideBottom = side({ ankle: [0.1, 0.74], knee: [0.3, 0.73], hip: [0.5, 0.74], shoulder: [0.75, 0.78], elbow: [0.66, 0.82], wrist: [0.75, 0.85] });

const kneeTop = side({ knee: [0.35, 0.85], hip: [0.55, 0.72], shoulder: [0.78, 0.6], elbow: [0.78, 0.725], wrist: [0.78, 0.85] });
const kneeBottom = side({ knee: [0.35, 0.85], hip: [0.55, 0.78], shoulder: [0.78, 0.76], elbow: [0.69, 0.8], wrist: [0.78, 0.85] });

// Front-on: hips hidden behind the head and shoulders.
const front = (shoulderY, halfWidth) =>
  pose({
    [LM.L_SHOULDER]: [0.5 - halfWidth, shoulderY], [LM.R_SHOULDER]: [0.5 + halfWidth, shoulderY],
    [LM.L_WRIST]: [0.38, 0.8], [LM.R_WRIST]: [0.62, 0.8],
    [LM.L_HIP]: [0.45, 0.4, 0.1], [LM.R_HIP]: [0.55, 0.4, 0.1],
  });
const frontTop = front(0.45, 0.1);
const frontBottom = front(0.72, 0.15); // shoulders drop and look wider as they near the camera

describe('push-ups that should count', () => {
  it('side-on push-ups', () => {
    expect(pushupReading(sideTop).view).toBe('side');
    expect(countReps([sideTop, sideMid, sideBottom, sideMid, sideTop, sideBottom, sideTop])).toBe(2);
  });

  it('knee push-ups', () => {
    expect(countReps([kneeTop, kneeBottom, kneeTop, kneeBottom, kneeTop])).toBe(2);
  });

  it('front-on push-ups', () => {
    expect(pushupReading(frontTop).view).toBe('front');
    expect(countReps([frontTop, frontBottom, frontTop, frontBottom, frontTop])).toBe(2);
  });

  it('works with only one side of the body visible', () => {
    const oneSide = sideTop.map((p, i) => ([LM.R_SHOULDER, LM.R_ELBOW, LM.R_WRIST, LM.R_HIP, LM.R_KNEE].includes(i) ? { ...p, visibility: 0.1 } : p));
    expect(pushupReading(oneSide)?.view).toBe('side');
  });
});

// --- Cheats ------------------------------------------------------------------
const standing = (wristY, elbowY) =>
  pose({
    [LM.L_SHOULDER]: [0.4, 0.3], [LM.R_SHOULDER]: [0.6, 0.3],
    [LM.L_ELBOW]: [0.38, elbowY], [LM.R_ELBOW]: [0.62, elbowY],
    [LM.L_WRIST]: [0.4, wristY], [LM.R_WRIST]: [0.6, wristY],
    [LM.L_HIP]: [0.42, 0.6], [LM.R_HIP]: [0.58, 0.6],
    [LM.L_KNEE]: [0.42, 0.8], [LM.R_KNEE]: [0.58, 0.8],
  });

describe('cheats that should score 0', () => {
  it('bending the elbows with arms overhead (facing the camera)', () => {
    const straight = standing(0.0, 0.15);
    const bent = standing(0.2, 0.1);
    expect(pushupReading(straight)).toBeNull();
    expect(countReps([straight, bent, straight, bent, straight])).toBe(0);
  });

  it('bending the elbows with arms overhead (side-on)', () => {
    const up = side({ shoulder: [0.5, 0.3], elbow: [0.5, 0.15], wrist: [0.5, 0.0], hip: [0.5, 0.6], knee: [0.5, 0.8] });
    const bent = side({ shoulder: [0.5, 0.3], elbow: [0.52, 0.12], wrist: [0.45, 0.22], hip: [0.5, 0.6], knee: [0.5, 0.8] });
    expect(countReps([up, bent, up, bent, up])).toBe(0);
  });

  it('standing arm curls', () => {
    const down = standing(0.6, 0.45);
    const curled = standing(0.32, 0.45);
    expect(countReps([down, curled, down, curled, down])).toBe(0);
  });

  it('kneeling upright and bobbing the shoulders', () => {
    const kneel = (shoulderY) =>
      pose({
        [LM.L_SHOULDER]: [0.4, shoulderY], [LM.R_SHOULDER]: [0.6, shoulderY],
        [LM.L_WRIST]: [0.38, 0.6], [LM.R_WRIST]: [0.62, 0.6],
        [LM.L_HIP]: [0.42, 0.65], [LM.R_HIP]: [0.58, 0.65],
      });
    expect(countReps([kneel(0.3), kneel(0.5), kneel(0.3), kneel(0.5), kneel(0.3)])).toBe(0);
  });

  it('a body that is folded in half (piked) does not count side-on', () => {
    const piked = side({ knee: [0.4, 0.85], hip: [0.5, 0.55], shoulder: [0.75, 0.62], elbow: [0.75, 0.735], wrist: [0.75, 0.85] });
    expect(pushupReading(piked)?.view).not.toBe('side');
  });
});
