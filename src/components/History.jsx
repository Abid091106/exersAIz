export default function History({ history, totalEarned, onReset }) {
  if (history.length === 0) {
    return <p className="muted center">No activity yet. Do a workout to earn your first tokens.</p>;
  }
  return (
    <section className="history">
      <p className="muted">Lifetime tokens earned: {totalEarned}</p>
      <ul>
        {history.map((h, i) => (
          <li key={i} className={h.type}>
            <span>{h.type === 'earn' ? `${h.reps} × ${h.exercise}` : h.label}</span>
            <span className="when">{new Date(h.ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <strong>{h.type === 'spend' ? `−${h.amount}` : `+${h.amount}`}</strong>
          </li>
        ))}
      </ul>
      <button
        className="link"
        onClick={() => window.confirm('Reset all tokens and history?') && onReset()}
      >
        Reset wallet
      </button>
    </section>
  );
}
