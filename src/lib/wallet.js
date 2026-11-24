import { useCallback, useRef, useState } from 'react';

const KEY = 'exersaiz.wallet.v1';
const MAX_HISTORY = 100;

/** Most tokens anyone can earn from exercise in one calendar day. */
export const DAILY_EARN_CAP = 50;

/** Welcome bonus so new users (and demos) can try the coach and shop straight away. */
export const STARTING_TOKENS = 50;

export const EMPTY_WALLET = {
  balance: 0,
  totalEarned: 0,
  earnedToday: 0,
  earnedDay: null, // local date (YYYY-MM-DD) that earnedToday belongs to
  history: [],
};

export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tokens already earned today (resets automatically at midnight). */
export function earnedTodayOf(w, now = Date.now()) {
  return w.earnedDay === dayKey(now) ? w.earnedToday : 0;
}

/**
 * Add tokens, respecting the daily cap. Reps in the same workout (sessionId)
 * merge into one history line. Returns how many tokens were actually granted.
 */
export function applyEarn(w, amount, { exercise, sessionId }, now = Date.now()) {
  const today = earnedTodayOf(w, now);
  const granted = Math.max(0, Math.min(amount, DAILY_EARN_CAP - today));
  if (granted === 0) return { wallet: w, granted: 0 };

  const [last, ...rest] = w.history;
  const merge = last?.type === 'earn' && last.sessionId === sessionId && last.exercise === exercise;
  const entry = merge
    ? { ...last, amount: last.amount + granted, reps: last.reps + 1, ts: now }
    : { type: 'earn', amount: granted, reps: 1, exercise, sessionId, ts: now };

  return {
    granted,
    wallet: {
      ...w,
      balance: w.balance + granted,
      totalEarned: w.totalEarned + granted,
      earnedToday: today + granted,
      earnedDay: dayKey(now),
      history: [entry, ...(merge ? rest : w.history)].slice(0, MAX_HISTORY),
    },
  };
}

/** Spend tokens. Fails (ok: false, nothing changes) if the balance is too low. */
export function applySpend(w, amount, label, now = Date.now()) {
  if (w.balance < amount) return { wallet: w, ok: false };
  return {
    ok: true,
    wallet: {
      ...w,
      balance: w.balance - amount,
      history: [{ type: 'spend', amount, label, ts: now }, ...w.history].slice(0, MAX_HISTORY),
    },
  };
}

/** Give tokens back (e.g. the AI coach failed to answer). Doesn't count toward the daily cap. */
export function applyRefund(w, amount, label, now = Date.now()) {
  return {
    ...w,
    balance: w.balance + amount,
    history: [{ type: 'refund', amount, label, ts: now }, ...w.history].slice(0, MAX_HISTORY),
  };
}

/** A brand-new wallet with the welcome bonus. Doesn't count toward the daily earning cap. */
export function newWallet(now = Date.now()) {
  return {
    ...EMPTY_WALLET,
    balance: STARTING_TOKENS,
    history: [{ type: 'bonus', amount: STARTING_TOKENS, label: '🎁 Welcome bonus', ts: now }],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_WALLET, ...JSON.parse(raw) } : newWallet();
  } catch {
    return newWallet();
  }
}

function save(wallet) {
  try {
    localStorage.setItem(KEY, JSON.stringify(wallet));
  } catch {
    // Storage can be unavailable (private mode etc.) — the app still works for this visit.
  }
}

/** Token wallet kept in the browser. */
export function useWallet() {
  const [wallet, setWallet] = useState(load);
  const ref = useRef(wallet);

  const commit = useCallback((next) => {
    ref.current = next;
    save(next);
    setWallet(next);
  }, []);

  /** Returns the number of tokens granted (0 once the daily cap is hit). */
  const earn = useCallback(
    (amount, meta) => {
      const { wallet: next, granted } = applyEarn(ref.current, amount, meta);
      if (granted) commit(next);
      return granted;
    },
    [commit]
  );

  const spend = useCallback(
    (amount, label) => {
      const { wallet: next, ok } = applySpend(ref.current, amount, label);
      if (ok) commit(next);
      return ok;
    },
    [commit]
  );

  const refund = useCallback((amount, label) => commit(applyRefund(ref.current, amount, label)), [commit]);
  const reset = useCallback(() => commit(newWallet()), [commit]);

  return { ...wallet, earnedToday: earnedTodayOf(wallet), earn, spend, refund, reset };
}
