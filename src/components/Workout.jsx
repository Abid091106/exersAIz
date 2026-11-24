import { useCallback, useEffect, useRef, useState } from 'react';
import { EXERCISES } from '../pose/exercises.js';
import { RepCounter } from '../pose/RepCounter.js';
import { usePoseTracker } from '../pose/usePoseTracker.js';

export default function Workout({ onEarn }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [exerciseId, setExerciseId] = useState('squat');
  const exercise = EXERCISES[exerciseId];

  const counterRef = useRef(new RepCounter(exercise));
  const sessionRef = useRef(null);
  const [reps, setReps] = useState(0);
  const [earned, setEarned] = useState(0);
  const [tip, setTip] = useState(null);
  const [bodyFound, setBodyFound] = useState(false);
  const [flash, setFlash] = useState(0);
  const tipTimer = useRef(0);

  // Switching exercise starts a fresh counter.
  useEffect(() => {
    counterRef.current = new RepCounter(exercise);
    setReps(0);
  }, [exercise]);

  const onPose = useCallback(
    (landmarks, aspect) => {
      setBodyFound((prev) => (prev === !!landmarks ? prev : !!landmarks));
      if (!landmarks) return;
      const ex = counterRef.current.exercise;
      const result = counterRef.current.update(ex.measure(landmarks, aspect));
      if (result.rep) {
        setReps(counterRef.current.reps);
        setEarned((e) => e + ex.credits);
        setFlash((f) => f + 1);
        onEarn(ex.credits, { exercise: ex.name, sessionId: sessionRef.current });
      }
      if (result.tip) {
        setTip(result.tip);
        clearTimeout(tipTimer.current);
        tipTimer.current = setTimeout(() => setTip(null), 2500);
      }
    },
    [onEarn]
  );

  const { status, error, start, stop } = usePoseTracker({ videoRef, canvasRef, onPose });
  const running = status === 'running';

  const begin = () => {
    sessionRef.current = crypto.randomUUID?.() ?? String(Date.now());
    counterRef.current.reset();
    setReps(0);
    setEarned(0);
    start();
  };

  return (
    <section className="workout">
      <div className="exercise-picker" role="radiogroup" aria-label="Exercise">
        {Object.values(EXERCISES).map((ex) => (
          <button
            key={ex.id}
            role="radio"
            aria-checked={ex.id === exerciseId}
            className={ex.id === exerciseId ? 'chip active' : 'chip'}
            onClick={() => setExerciseId(ex.id)}
          >
            {ex.emoji} {ex.name} <span className="muted">+{ex.credits}/rep</span>
          </button>
        ))}
      </div>

      <div className="stage">
        <video ref={videoRef} playsInline muted className="mirror" />
        <canvas ref={canvasRef} className="mirror overlay" />

        {!running && (
          <div className="stage-message">
            {status === 'loading' ? (
              <p>Loading camera and AI model…</p>
            ) : (
              <>
                <p className="setup">{exercise.setup}</p>
                {error && <p className="error">{error}</p>}
                <button className="primary big" onClick={begin}>
                  Start workout
                </button>
              </>
            )}
          </div>
        )}

        {running && (
          <>
            <div className="hud">
              <div key={flash} className="rep-count pop">
                {reps}
                <span>{exercise.name.toLowerCase()}</span>
              </div>
              <div className="session-credits">+{earned} credits</div>
            </div>
            {!bodyFound && <div className="banner warn">Step back so your whole body is in view</div>}
            {tip && <div className="banner tip">{tip}</div>}
          </>
        )}
      </div>

      {running && (
        <button className="secondary" onClick={stop}>
          Finish workout
        </button>
      )}
    </section>
  );
}
