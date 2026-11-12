import { useEffect, useRef, useState } from "react";

export default function AudioWaveform({ stream, active = false, barCount = 20, barClassName = "bg-white/90" }) {
  const [levels, setLevels] = useState(() => Array.from({ length: barCount }, () => 0.18));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active || !stream) {
      setLevels(Array.from({ length: barCount }, () => 0.16));
      return undefined;
    }

    let audioCtx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx || stream.getAudioTracks().length === 0) return undefined;
      audioCtx = new Ctx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const next = Array.from({ length: barCount }, (_, idx) => {
          const bin = dataArray[idx % dataArray.length] || 0;
          return Math.max(0.15, Math.min(1, bin / 220));
        });
        setLevels(next);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);
    } catch {
      // Fallback subtle pulse if Web Audio API cannot attach
    }

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream, active, barCount]);

  return (
    <div aria-hidden="true" className="flex h-7 items-center gap-1">
      {levels.map((lvl, idx) => (
        <span
          key={idx}
          style={{ height: `${Math.round(lvl * 26)}px` }}
          className={`w-1 rounded-full transition-all duration-150 ${barClassName}`}
        />
      ))}
    </div>
  );
}