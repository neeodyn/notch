import { useRef, useState } from "react";
import { Keyboard, Mic, Square, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import AudioWaveform from "@/components/notch/AudioWaveform";

function pickSupportedAudioMime() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  if (window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (window.MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export default function VoiceEditDock({ onApplyVoiceEdit, isApplying }) {
  const [recording, setRecording] = useState(false);
  const [showTypeBox, setShowTypeBox] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [stream, setStream] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  async function startMic() {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedAudioMime();
      const rec = mimeType ? new MediaRecorder(media, { mimeType }) : new MediaRecorder(media);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(250);
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setStream(media);
      setRecording(true);
    } catch {
      setShowTypeBox(true);
    }
  }

  async function stopAndSendMic() {
    const rec = recorderRef.current;
    if (!rec) return;

    const durationS = Math.max(2, (Date.now() - startedAtRef.current) / 1000);
    const blob = await new Promise((resolve) => {
      rec.onstop = () => {
        const mime = rec.mimeType || "audio/webm";
        resolve(new Blob(chunksRef.current, { type: mime }));
      };
      rec.stop();
    });

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setRecording(false);

    try {
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `voice-edit-${Date.now()}.${ext}`, { type: blob.type || "audio/webm" });
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await onApplyVoiceEdit({ fileUri: file_uri, durationS, manualTranscript: "" });
    } catch (err) {
      toast.error(err?.message || "Could not apply voice change");
    }
  }

  async function submitTypedEdit(e) {
    e.preventDefault();
    const clean = typedText.trim();
    if (!clean) return;
    await onApplyVoiceEdit({ fileUri: "", durationS: 6, manualTranscript: clean });
    setTypedText("");
    setShowTypeBox(false);
  }

  return (
    <div className="above-dock pointer-events-none fixed inset-x-0 z-20 flex flex-col items-end px-4 sm:px-6">
      <div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col items-end gap-2">
        {showTypeBox && !recording && (
          <form
            onSubmit={submitTypedEdit}
            className="glass-panel w-full rounded-[24px] border border-border bg-card p-4 shadow-lg sm:max-w-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-foreground">Say or type a change</span>
              <button
                type="button"
                onClick={() => setShowTypeBox(false)}
                aria-label="Close change input"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Hallway is four fifty, or add 3 coats to lounge"
              className="h-12 w-full rounded-xl border border-input bg-background px-3.5 text-[15px]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Hallway is four fifty", "Lounge is 3 coats", "25 percent deposit"].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setTypedText(ex)}
                  className="rounded-lg bg-secondary px-2.5 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={isApplying || !typedText.trim()}
              className="mt-2.5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isApplying ? "Updating quote…" : "Apply change"}
            </button>
          </form>
        )}

        {recording ? (
          <div className="flex items-center gap-3 rounded-full bg-zinc-950 px-4 py-2 text-white shadow-xl">
            <AudioWaveform stream={stream} active={recording} barCount={12} />
            <button
              type="button"
              onClick={stopAndSendMic}
              aria-label="Finish speaking change"
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-destructive text-white"
            >
              <Square className="h-6 w-6 fill-current" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTypeBox((v) => !v)}
              aria-label="Type a change instead of speaking"
              className="glass-panel flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md hover:text-foreground"
            >
              <Keyboard className="h-5 w-5" />
            </button>

            <button
              type="button"
              disabled={isApplying}
              onClick={startMic}
              aria-label="Say a change"
              className="voice-glass-control flex h-[68px] w-[68px] flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-primary-foreground shadow-xl transition-transform duration-200 active:scale-95 disabled:opacity-60"
            >
              <Mic className="h-6 w-6" />
              <span className="text-[10px] font-semibold tracking-tight">
                {isApplying ? "Updating…" : "Say change"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}