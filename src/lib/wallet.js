import { useCallback, useState } from 'react';

const KEY = 'exersaiz.wallet.v1';
const EMPTY = { balance: 0, totalEarned: 0, history: [] };
const MAX_HISTORY = 100;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(wallet) {
  try {
    localStorage.setItem(KEY, JSON.stringify(wallet));
  } catch {
    // Storage can be unavailable (private mode etc.) — the app still works for this visit.
  }
}

/** Credits wallet kept in the browser. Swap for a real backend later. */
export function useWallet() {
  const [wallet, setWallet] = useState(load);

  const update = useCallback((fn) => {
    setWallet((w) => {
      const next = fn(w);
      save(next);
      return next;
    });
  }, []);

  /**
   * Add credits. Pass the same sessionId for every rep in a workout and they
   * merge into one history line ("12 Squats  +24") instead of one per rep.
   */
  const earn = useCallback(
    (amount, { exercise, sessionId }) =>
      update((w) => {
        const [last, ...rest] = w.history;
        const merge = last?.type === 'earn' && last.sessionId === sessionId && last.exercise === exercise;
        const entry = merge
          ? { ...last, amount: last.amount + amount, reps: last.reps + 1, ts: Date.now() }
          : { type: 'earn', amount, reps: 1, exercise, sessionId, ts: Date.now() };
        return {
          balance: w.balance + amount,
          totalEarned: w.totalEarned + amount,
          history: [entry, ...(merge ? rest : w.history)].slice(0, MAX_HISTORY),
        };
      }),
    [update]
  );

  /** Returns false (and changes nothing) if there aren't enough credits. */
  const spend = useCallback(
    (amount, label) => {
      if (wallet.balance < amount) return false;
      update((w) => ({
        ...w,
        balance: w.balance - amount,
        history: [{ type: 'spend', amount, label, ts: Date.now() }, ...w.history].slice(0, MAX_HISTORY),
      }));
      return true;
    },
    [wallet.balance, update]
  );

  const reset = useCallback(() => update(() => EMPTY), [update]);

  return { ...wallet, earn, spend, reset };
}
