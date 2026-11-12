import { useCallback, useEffect, useRef, useState } from "react";

function pickMime() {
  if (!window.MediaRecorder?.isTypeSupported) return "";
  if (window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (window.MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

/**
 * Short voice clip recorder. Always releases the microphone on stop, cancel
 * and unmount. `error` is "denied", "unsupported" or "failed" when the mic
 * can't be used, so the screen can offer typing instead.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState("idle");
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedRef = useRef(0);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    setStream(null);
    setState("idle");
  }, []);

  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    release();
  }, [release]);

  useEffect(() => cancel, [cancel]);

  useEffect(() => {
    if (state !== "recording") return undefined;
    const id = window.setInterval(() => setElapsed((Date.now() - startedRef.current) / 1000), 250);
    return () => window.clearInterval(id);
  }, [state]);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
      setError("unsupported");
      return false;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const rec = mimeType ? new MediaRecorder(media, { mimeType }) : new MediaRecorder(media);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => ev.data?.size > 0 && chunksRef.current.push(ev.data);
      rec.start(250);
      recRef.current = rec;
      streamRef.current = media;
      startedRef.current = Date.now();
      setElapsed(0);
      setStream(media);
      setState("recording");
      return true;
    } catch (err) {
      setError(err?.name === "NotAllowedError" || err?.name === "SecurityError" ? "denied" : "failed");
      release();
      return false;
    }
  }

  async function stop() {
    const rec = recRef.current;
    if (!rec) return null;
    const durationS = Math.max(1, (Date.now() - startedRef.current) / 1000);
    const blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    release();
    return { blob, durationS, ext: blob.type.includes("mp4") ? "m4a" : "webm" };
  }

  return { state, stream, error, elapsed, start, stop, cancel };
}