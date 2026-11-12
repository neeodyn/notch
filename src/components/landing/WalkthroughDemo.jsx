import { useEffect, useState } from "react";
import { Camera, Check, Mic, Pause, Play, RotateCcw } from "lucide-react";

const WALKTHROUGH_STEPS = [
  {
    at: 0,
    until: 10,
    timeLabel: "0:04",
    stage: "Walking in",
    spoken:
      "Quote for Claire Whitaker at 418 Hollow Creek Lane, phone 512-555-0148. Twenty-five percent deposit, back gate is 42 inches.",
    photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1000&q=80",
    snappedCount: 0,
    pin: null,
    runningTotal: 0,
    lines: [],
  },
  {
    at: 10,
    until: 22,
    timeLabel: "0:14",
    stage: "Snap Tree 1",
    spoken:
      "Tree one is this 62-foot Live Oak over the garage and cedar fence. Crown reduction, haul everything, fourteen fifty.",
    photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1000&q=80",
    snappedCount: 1,
    pin: { n: 1, x: "52%", y: "36%" },
    runningTotal: 1450,
    lines: [{ label: "1. Live Oak · Crown reduce", price: "$1,450", badge: "Spoken" }],
  },
  {
    at: 22,
    until: 33,
    timeLabel: "0:27",
    stage: "Snap Tree 2",
    spoken:
      "Second tree, dying 48-foot Silver Maple on the side line. Full removal and haul for eighteen fifty. Make stump grind optional at two seventy-five.",
    photoUrl: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1000&q=80",
    snappedCount: 2,
    pin: { n: 2, x: "46%", y: "42%" },
    runningTotal: 3300,
    lines: [
      { label: "1. Live Oak · Crown reduce", price: "$1,450", badge: "Spoken" },
      { label: "2. Silver Maple · Remove", price: "$1,850", badge: "Spoken" },
      { label: "Optional · Stump grind", price: "+$275", badge: "Optional" },
    ],
  },
  {
    at: 33,
    until: 40,
    timeLabel: "0:38",
    stage: "Ready to send",
    spoken: "Done. Photos matched to both trees, optional stump separated, link ready to text the homeowner.",
    photoUrl: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1000&q=80",
    snappedCount: 2,
    pin: { n: 2, x: "46%", y: "42%" },
    runningTotal: 3300,
    lines: [
      { label: "1. Live Oak · Crown reduce", price: "$1,450", badge: "Spoken" },
      { label: "2. Silver Maple · Remove", price: "$1,850", badge: "Spoken" },
      { label: "Optional · Stump grind", price: "+$275", badge: "Optional" },
    ],
  },
];

export default function WalkthroughDemo() {
  const [seconds, setSeconds] = useState(12);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev >= 40) {
          setPlaying(false);
          return 40;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing]);

  const activeStep =
    WALKTHROUGH_STEPS.find((s) => seconds >= s.at && seconds < s.until) ||
    WALKTHROUGH_STEPS[WALKTHROUGH_STEPS.length - 1];

  const formattedClock = `0:${String(seconds).padStart(2, "0")} / 0:40`;

  function handlePlayPause() {
    if (seconds >= 40) {
      setSeconds(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  return (
    <section aria-label="40-second yard walkthrough" className="rounded-[20px] border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-[14px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            40-second yard walk · Sample preview
          </span>
        </div>
        <span className="tabular-money text-[14px] font-medium text-muted-foreground">{formattedClock}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Simulated iPhone Capture Frame */}
        <div className="relative overflow-hidden rounded-[18px] bg-zinc-950 text-white lg:col-span-7">
          <div className="relative aspect-[16/11] w-full overflow-hidden sm:aspect-[16/10]">
            <img
              src={activeStep.photoUrl}
              alt={activeStep.stage}
              className="h-full w-full object-cover opacity-90 transition-opacity duration-300"
            />
            <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-xl bg-black/70 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-emerald-400" />
                <span className="text-[13px] font-medium">{activeStep.stage}</span>
              </div>
              <span className="tabular-money text-[13px] font-semibold text-zinc-200">{activeStep.timeLabel}</span>
            </div>

            {activeStep.pin && (
              <div
                style={{ left: activeStep.pin.x, top: activeStep.pin.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-[15px] font-bold text-white shadow-md">
                  {activeStep.pin.n}
                </span>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/75 p-3 backdrop-blur-md">
              <p className="text-[14px] leading-snug text-zinc-100">&ldquo;{activeStep.spoken}&rdquo;</p>
              <div className="mt-2.5 flex items-center justify-between border-t border-white/15 pt-2 text-[12px] text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {activeStep.snappedCount} {activeStep.snappedCount === 1 ? "tree snapped" : "trees snapped"}
                </span>
                <span>One continuous stream</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Drafted Quote Output */}
        <div className="flex flex-col justify-between rounded-[18px] bg-background p-4 sm:p-5 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Client</p>
                <p className="text-[17px] font-semibold text-foreground">Claire Whitaker</p>
                <p className="text-[14px] text-muted-foreground">418 Hollow Creek Ln</p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-semibold text-secondary-foreground">
                25% deposit
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {activeStep.lines.length === 0 ? (
                <p className="py-6 text-center text-[15px] text-muted-foreground">
                  Listening for first tree and spoken price…
                </p>
              ) : (
                activeStep.lines.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-[15px] font-medium text-foreground">{line.label}</p>
                      <span className="text-[12px] text-muted-foreground">{line.badge}</span>
                    </div>
                    <span className="tabular-money text-[16px] font-semibold text-foreground">{line.price}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="text-[14px] font-medium text-muted-foreground">Subtotal (before tax)</span>
            <span className="tabular-money text-[22px] font-bold text-foreground">
              ${activeStep.runningTotal.toLocaleString("en-US")}
            </span>
          </div>
        </div>
      </div>

      {/* Controls & Chapter Pills */}
      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayPause}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause walk" : seconds >= 40 ? "Replay 40s walk" : "Play 40s walk"}
          </button>
          {seconds > 0 && (
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setSeconds(0);
              }}
              aria-label="Reset walkthrough"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {WALKTHROUGH_STEPS.map((step) => {
            const isCurrent = activeStep.stage === step.stage;
            return (
              <button
                key={step.stage}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setSeconds(step.at + 2);
                }}
                className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-medium transition-colors duration-200 ${
                  isCurrent
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {seconds > step.until && <Check className="h-3.5 w-3.5" />}
                <span>{step.stage}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}