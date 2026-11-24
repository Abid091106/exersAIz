import { describe, it, expect } from 'vitest';
import { RepCounter } from './RepCounter.js';
import { EXERCISES } from './exercises.js';
import { angleDeg } from './geometry.js';

// Feed each value several times so the smoothing settles, like real video frames.
function feed(counter, values, framesEach = 6) {
  const out = [];
  for (const v of values) for (let i = 0; i < framesEach; i++) out.push(counter.update(v));
  return out;
}

describe('angleDeg', () => {
  it('computes right and straight angles', () => {
    expect(angleDeg({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180);
  });
});

describe('RepCounter (squat)', () => {
  it('counts full squats', () => {
    const c = new RepCounter(EXERCISES.squat);
    feed(c, [175, 130, 85, 130, 175, 130, 85, 130, 175]);
    expect(c.reps).toBe(2);
  });

  it('ignores half squats and gives a tip', () => {
    const c = new RepCounter(EXERCISES.squat);
    const out = feed(c, [175, 125, 175]);
    expect(c.reps).toBe(0);
    expect(out.some((r) => r.tip)).toBe(true);
  });

  it('does not count jitter near the bottom as extra reps', () => {
    const c = new RepCounter(EXERCISES.squat);
    feed(c, [175, 85, 105, 88, 104, 86, 175]);
    expect(c.reps).toBe(1);
  });

  it('skips frames where the body is not visible', () => {
    const c = new RepCounter(EXERCISES.squat);
    feed(c, [175, null, 85, null, 175]);
    expect(c.reps).toBe(1);
  });
});

describe('RepCounter (jumping jack)', () => {
  it('counts open-close cycles', () => {
    const c = new RepCounter(EXERCISES.jumpingJack);
    feed(c, [0, 1, 0, 1, 0, 1, 0]);
    expect(c.reps).toBe(3);
  });
});
