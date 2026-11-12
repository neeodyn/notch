import { Mic, Square } from "lucide-react";
import AudioWaveform from "@/components/notch/AudioWaveform";

const EXAMPLES = ["Hallway is four fifty", "Lounge is three coats", "Make the lounge ceiling optional", "Thirty percent deposit"];

const MIC_ERRORS = {
  denied: "Microphone access is blocked. Allow it in your browser settings, or type the change below.",
  unsupported: "This browser can't record audio here. Type the change below instead.",
  failed: "Couldn't start the microphone. Try again, or type the change below.",
};

function clock(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Listening({ recorder, onStop }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] bg-card px-5 py-7 text-center">
      <p className="text-[15px] font-medium text-muted-foreground" aria-live="polite">
        Listening <span className="tabular-money">{clock(recorder.elapsed)}</span>
      </p>
      <div className="mt-4 flex h-10 items-center">
        <AudioWaveform stream={recorder.stream} active barCount={18} barClassName="bg-primary" />
      </div>
      <button
        type="button"
        onClick={onStop}
        aria-label="Done speaking"
        className="mt-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform active:scale-95"
      >
        <Square className="h-6 w-6 fill-current" />
      </button>
      <p className="mt-3 text-[14px] text-muted-foreground">Tap when you've finished</p>
      <button type="button" onClick={recorder.cancel} className="mt-1 min-h-11 px-4 text-[15px] font-medium text-primary">
        Cancel
      </button>
    </div>
  );
}

export default function ChangeInput({ recorder, typed, onTypedChange, onStart, onStop, onSubmitTyped, error }) {
  if (recorder.state === "recording") return <Listening recorder={recorder} onStop={onStop} />;

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] leading-snug text-destructive">
          {error}
        </p>
      )}
      {recorder.error !== "unsupported" && (
        <button type="button" onClick={onStart} className="flex w-full items-center gap-4 rounded-[24px] bg-card p-4 text-left transition-colors active:bg-secondary">
          <span className="voice-glass-control flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Mic className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold text-foreground">Tap and say it</span>
            <span className="mt-0.5 block text-[14px] leading-snug text-muted-foreground">You'll check every change before the quote updates.</span>
          </span>
        </button>
      )}
      {recorder.error && <p className="text-[14px] leading-snug text-muted-foreground">{MIC_ERRORS[recorder.error]}</p>}
      <form onSubmit={(e) => { e.preventDefault(); onSubmitTyped(); }}>
        <label htmlFor="quote-change-text" className="text-[14px] font-medium text-muted-foreground">Or type it</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="quote-change-text"
            type="text"
            value={typed}
            onChange={(e) => onTypedChange(e.target.value)}
            enterKeyHint="send"
            autoComplete="off"
            placeholder="Hallway is four fifty"
            className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 text-[16px]"
          />
          <button type="submit" disabled={!typed.trim()} className="h-12 shrink-0 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-40">
            Check
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => onTypedChange(ex)} className="min-h-11 rounded-full bg-secondary px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}