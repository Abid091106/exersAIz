import { useEffect, useRef, useState } from 'react';

export const COACH_COST = 5;
const SUGGESTIONS = ['How did I do today?', 'How do I improve my squat form?', 'Plan me a 10-minute workout'];
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Reps per exercise over the last week, from wallet history, for the coach's context. */
function recentReps(history) {
  const cutoff = Date.now() - WEEK;
  const reps = {};
  for (const h of history) {
    if (h.type === 'earn' && h.ts >= cutoff) reps[h.exercise] = (reps[h.exercise] ?? 0) + h.reps;
  }
  return reps;
}

export default function Coach({ wallet, dailyCap }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const canAfford = wallet.balance >= COACH_COST;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  async function send(text) {
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    if (!wallet.spend(COACH_COST, '🤖 Coach message')) {
      setError(`You need ${COACH_COST} tokens to ask the coach. Go earn some!`);
      return;
    }

    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          stats: {
            earnedToday: wallet.earnedToday,
            dailyCap,
            totalEarned: wallet.totalEarned,
            reps: recentReps(wallet.history),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) throw new Error(data.error || 'The coach could not answer right now.');
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      wallet.refund(COACH_COST, '↩️ Coach refund');
      setMessages(messages); // drop the unanswered question so the chat stays valid
      setInput(content);
      setError(`${err.message} Your ${COACH_COST} tokens were refunded.`);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="coach">
      <div className="chat">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="coach-avatar">🤖</div>
            <p>
              I'm your AI fitness coach. Ask me about form, workouts or your progress.
              <br />
              <span className="muted">Each message costs {COACH_COST} tokens.</span>
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" disabled={!canAfford || sending} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="bubble assistant typing">Coach is typing…</div>}
        <div ref={endRef} />
      </div>

      {error && <div className="banner warn">{error}</div>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={800}
          placeholder={canAfford ? 'Ask your coach…' : `Earn ${COACH_COST - wallet.balance} more tokens to chat`}
          disabled={sending}
          aria-label="Message the coach"
        />
        <button className="primary" type="submit" disabled={!canAfford || sending || !input.trim()}>
          Send · {COACH_COST}🪙
        </button>
      </form>
    </section>
  );
}
