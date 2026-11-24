import { useState } from 'react';
import Workout from './components/Workout.jsx';
import Shop from './components/Shop.jsx';
import History from './components/History.jsx';
import { useWallet } from './lib/wallet.js';

const TABS = [
  { id: 'workout', label: '🏋️ Workout' },
  { id: 'shop', label: '🎁 Spend' },
  { id: 'history', label: '📜 History' },
];

export default function App() {
  const wallet = useWallet();
  const [tab, setTab] = useState('workout');

  return (
    <div className="app">
      <header>
        <h1>
          exers<span className="accent">AI</span>z
        </h1>
        <div className="balance" aria-label="Credit balance">
          <span className="coin">🪙</span> {wallet.balance}
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {/* Leaving the Workout tab unmounts it, which stops the camera. */}
        {tab === 'workout' && <Workout onEarn={wallet.earn} />}
        {tab === 'shop' && <Shop balance={wallet.balance} onSpend={wallet.spend} />}
        {tab === 'history' && (
          <History history={wallet.history} totalEarned={wallet.totalEarned} onReset={wallet.reset} />
        )}
      </main>

      <footer className="muted">Pose tracking runs entirely in your browser — no video leaves your device.</footer>
    </div>
  );
}
