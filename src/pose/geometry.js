// MediaPipe pose landmark indices we care about.
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
};

const MIN_VISIBILITY = 0.5;

/** True if every given landmark exists and the model is reasonably sure it's on screen. */
export function visible(...points) {
  return points.every((p) => p && (p.visibility ?? 1) >= MIN_VISIBILITY);
}

/**
 * Angle ABC in degrees (the angle at joint B).
 * Landmarks are normalised to 0..1 on each axis, so x is scaled by the
 * frame's aspect ratio to stop wide frames squashing the angles.
 */
export function angleDeg(a, b, c, aspect = 1) {
  const v1x = (a.x - b.x) * aspect, v1y = a.y - b.y;
  const v2x = (c.x - b.x) * aspect, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag === 0) return null;
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Joint angle averaged over whichever body sides are visible (null if neither). */
export function sideAveragedAngle(lm, left, right, aspect) {
  const angles = [left, right]
    .filter(([a, b, c]) => visible(lm[a], lm[b], lm[c]))
    .map(([a, b, c]) => angleDeg(lm[a], lm[b], lm[c], aspect))
    .filter((x) => x != null);
  if (angles.length === 0) return null;
  return angles.reduce((s, x) => s + x, 0) / angles.length;
}
