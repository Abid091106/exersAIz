import { useState } from 'react';

// Edit freely — these are just example rewards.
export const REWARDS = [
  { id: 'scroll', emoji: '📱', name: '10 min social media', cost: 20 },
  { id: 'snack', emoji: '🍫', name: 'A guilt-free snack', cost: 30 },
  { id: 'episode', emoji: '📺', name: 'One episode of a show', cost: 60 },
  { id: 'gaming', emoji: '🎮', name: '1 hour of gaming', cost: 100 },
];

export default function Shop({ balance, onSpend }) {
  const [message, setMessage] = useState(null);

  const buy = (r) => {
    const ok = onSpend(r.cost, `${r.emoji} ${r.name}`);
    setMessage(ok ? `Unlocked: ${r.name}. Enjoy it — you earned it!` : null);
  };

  return (
    <section className="shop">
      {message && <div className="banner success">{message}</div>}
      <div className="reward-grid">
        {REWARDS.map((r) => {
          const short = r.cost - balance;
          return (
            <div key={r.id} className="reward">
              <div className="reward-emoji">{r.emoji}</div>
              <div className="reward-name">{r.name}</div>
              <button className="primary" disabled={short > 0} onClick={() => buy(r)}>
                {short > 0 ? `${short} more tokens` : `Spend ${r.cost}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
