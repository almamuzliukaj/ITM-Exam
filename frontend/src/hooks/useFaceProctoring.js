import { useCallback, useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export function useFaceProctoring({ enabled, onViolation }) {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const lastFaceEventRef = useRef({ type: "", at: 0 });
  const [status, setStatus] = useState("idle");
  const [faceCount, setFaceCount] = useState(0);
  const [error, setError] = useState("");

  const emitViolation = useCallback((type, message, metadata = {}) => {
    const now = Date.now();
    if (lastFaceEventRef.current.type === type && now - lastFaceEventRef.current.at < 8000) {
      return;
    }

    lastFaceEventRef.current = { type, at: now };
    onViolation?.(type, message, metadata);
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let intervalId = null;

    async function start() {
      try {
        setStatus("requesting");
        setError("");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("loading");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.55,
        });

        if (cancelled) return;
        detectorRef.current = detector;
        setStatus("active");

        intervalId = window.setInterval(() => {
          const video = videoRef.current;
          const detectorInstance = detectorRef.current;
          if (!video || !detectorInstance || video.readyState < 2) return;

          try {
            const result = detectorInstance.detectForVideo(video, performance.now());
            const detections = result?.detections || [];
            setFaceCount(detections.length);

            if (detections.length === 0) {
              emitViolation("NO_FACE_DETECTED", "No face was visible in the exam camera.", { faceCount: 0 });
            } else if (detections.length > 1) {
              emitViolation("MULTIPLE_FACES_DETECTED", "Multiple faces were visible in the exam camera.", { faceCount: detections.length });
            }
          } catch (detectError) {
            setStatus("error");
            setError("Face detection could not continue.");
            emitViolation("FACE_DETECTION_ERROR", "Face detection failed during the exam.", {
              error: detectError?.message || "Unknown detector error",
            });
          }
        }, 1600);
      } catch (cameraError) {
        if (cancelled) return;
        setStatus("blocked");
        setError("Camera permission is required for monitored exams.");
        emitViolation("CAMERA_UNAVAILABLE", "Camera permission was denied or unavailable.", {
          error: cameraError?.message || "Camera unavailable",
        });
      }
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      detectorRef.current?.close?.();
      detectorRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setFaceCount(0);
      setStatus("idle");
    };
  }, [emitViolation, enabled]);

  return {
    videoRef,
    status,
    faceCount,
    error,
  };
}
