import { describe, it, expect } from 'vitest';
import { EMPTY_WALLET, DAILY_EARN_CAP, applyEarn, applySpend, applyRefund, earnedTodayOf } from './wallet.js';

const meta = { exercise: 'Squats', sessionId: 's1' };
const DAY1 = new Date(2026, 10, 24, 18, 0).getTime();
const DAY2 = new Date(2026, 10, 25, 9, 0).getTime();

function earnTimes(w, n, amount, now) {
  let granted = 0;
  for (let i = 0; i < n; i++) {
    const r = applyEarn(w, amount, meta, now);
    w = r.wallet;
    granted += r.granted;
  }
  return { w, granted };
}

describe('daily earn cap', () => {
  it(`stops at ${DAILY_EARN_CAP} tokens a day`, () => {
    const { w, granted } = earnTimes(EMPTY_WALLET, 40, 2, DAY1); // 80 tokens worth of squats
    expect(granted).toBe(DAILY_EARN_CAP);
    expect(w.balance).toBe(DAILY_EARN_CAP);
  });

  it('grants a partial amount right at the cap', () => {
    const { w } = earnTimes(EMPTY_WALLET, 16, 3, DAY1); // 48
    const r = applyEarn(w, 3, meta, DAY1);
    expect(r.granted).toBe(2);
    expect(r.wallet.balance).toBe(50);
  });

  it('resets the next day but keeps the balance', () => {
    const { w } = earnTimes(EMPTY_WALLET, 30, 2, DAY1);
    expect(earnedTodayOf(w, DAY2)).toBe(0);
    const r = applyEarn(w, 2, meta, DAY2);
    expect(r.granted).toBe(2);
    expect(r.wallet.balance).toBe(52);
  });

  it('spending does not give extra earning room', () => {
    let { w } = earnTimes(EMPTY_WALLET, 25, 2, DAY1);
    w = applySpend(w, 20, 'x', DAY1).wallet;
    expect(applyEarn(w, 2, meta, DAY1).granted).toBe(0);
  });
});

describe('spend and refund', () => {
  it('refuses to overspend', () => {
    const w = earnTimes(EMPTY_WALLET, 2, 2, DAY1).w; // 4 tokens
    expect(applySpend(w, 5, 'AI', DAY1).ok).toBe(false);
  });

  it('refund restores balance without counting as earned', () => {
    let w = earnTimes(EMPTY_WALLET, 5, 2, DAY1).w; // 10
    w = applySpend(w, 5, 'AI', DAY1).wallet;
    w = applyRefund(w, 5, 'AI failed', DAY1);
    expect(w.balance).toBe(10);
    expect(w.earnedToday).toBe(10);
  });

  it('merges reps from one workout into one history line', () => {
    const { w } = earnTimes(EMPTY_WALLET, 5, 2, DAY1);
    expect(w.history).toHaveLength(1);
    expect(w.history[0]).toMatchObject({ reps: 5, amount: 10 });
  });
});
