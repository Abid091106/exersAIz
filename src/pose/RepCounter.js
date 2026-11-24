/**
 * Turns a stream of per-frame measurements into reps.
 *
 * A rep is: start "up" → pass the down threshold → come back past the up
 * threshold. Using two separate thresholds (hysteresis) stops jitter around
 * a single line from counting phantom reps. Values are smoothed with an
 * exponential moving average for the same reason.
 */
export class RepCounter {
  constructor(exercise, { smoothing = 0.4 } = {}) {
    this.exercise = exercise;
    this.smoothing = smoothing;
    this.reset();
  }

  reset() {
    this.reps = 0;
    this.phase = 'up';
    this.value = null;
    this.partial = false;
  }

  /**
   * @param {number|null} raw measurement for this frame
   * @returns {{ rep: boolean, tip: string|null, value: number|null, phase: string }}
   */
  update(raw) {
    const ex = this.exercise;
    if (raw == null || Number.isNaN(raw)) {
      return { rep: false, tip: null, value: this.value, phase: this.phase };
    }

    this.value = this.value == null ? raw : this.smoothing * raw + (1 - this.smoothing) * this.value;
    const v = this.value;
    let rep = false;
    let tip = null;

    if (this.phase === 'up') {
      if (ex.isDown(v)) {
        this.phase = 'down';
        this.partial = false;
      } else if (ex.isPartial?.(v)) {
        this.partial = true;
      } else if (this.partial && ex.isUp(v)) {
        // Went partway down then came back up without reaching the bottom.
        this.partial = false;
        tip = ex.partialTip ?? null;
      }
    } else if (ex.isUp(v)) {
      this.phase = 'up';
      this.reps += 1;
      rep = true;
    }

    return { rep, tip, value: v, phase: this.phase };
  }
}
