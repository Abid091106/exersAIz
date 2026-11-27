import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

// Keep the WASM version in step with the installed @mediapipe/tasks-vision package.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let landmarkerPromise = null;
function getLandmarker() {
  // Load the model once and reuse it between workouts.
  landmarkerPromise ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const options = (delegate) => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    try {
      return await PoseLandmarker.createFromOptions(vision, options('GPU'));
    } catch {
      return await PoseLandmarker.createFromOptions(vision, options('CPU'));
    }
  })().catch((err) => {
    landmarkerPromise = null; // allow a retry
    throw err;
  });
  return landmarkerPromise;
}

/**
 * Runs the webcam + pose model. Calls onPose(landmarks, aspect) every frame
 * a body is found and draws the skeleton on the canvas.
 */
export function usePoseTracker({ videoRef, canvasRef, onPose }) {
  const [status, setStatus] = useState('idle'); // idle | loading | running | error
  const [error, setError] = useState(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, [videoRef]);

  const start = useCallback(async () => {
    setError(null);
    setStatus('loading');
    try {
      const [landmarker, stream] = await Promise.all([
        getLandmarker(),
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false }),
      ]);
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const draw = new DrawingUtils(ctx);
      let lastTime = -1;

      const loop = () => {
        if (!streamRef.current) return;
        if (video.readyState >= 2 && video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const result = landmarker.detectForVideo(video, performance.now());
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const lm = result.landmarks?.[0];
          if (lm) {
            draw.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: '#1f4fbf', lineWidth: 5 });
            draw.drawLandmarks(lm, { color: '#ffffff', fillColor: '#fff27a', lineWidth: 2, radius: 5 });
          }
          onPoseRef.current?.(lm ?? null, video.videoWidth / video.videoHeight);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      setStatus('running');
      loop();
    } catch (err) {
      console.error(err);
      stop();
      setStatus('error');
      setError(
        err?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow it in your browser and try again.'
          : 'Could not start the camera or load the pose model. Check your connection and try again.'
      );
    }
  }, [videoRef, canvasRef, stop]);

  useEffect(() => stop, [stop]);

  return { status, error, start, stop };
}
