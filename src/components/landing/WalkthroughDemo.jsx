import { useEffect, useState } from "react";
import { Camera, Check, Mic, Pause, Play, RotateCcw } from "lucide-react";
import { Image } from "@/components/ui/image";
import { NZ_IMAGERY } from "@/lib/nzImagery";

const WALKTHROUGH_STEPS = [
  {
    at: 0,
    until: 10,
    timeLabel: "0:04",
    stage: "Client & address",
    spoken:
      "Quote for Sarah Miller, 14 Kauri Street, Ponsonby, 021 555 0134. Thirty percent deposit.",
    photoUrl: NZ_IMAGERY.exterior,
    snappedCount: 0,
    pin: null,
    exclGst: 0,
    gst: 0,
    inclGst: 0,
    lines: [],
  },
  {
    at: 10,
    until: 23,
    timeLabel: "0:14",
    stage: "Lounge · 5 × 4 m",
    spoken:
      "Lounge, five by four, stud two-four, walls and ceiling, two coats in Resene Alabaster, eleven hundred.",
    photoUrl: NZ_IMAGERY.lounge,
    snappedCount: 1,
    pin: { n: 1, x: "64%", y: "28%" },
    exclGst: 1100,
    gst: 165,
    inclGst: 1265,
    lines: [
      {
        label: "Lounge · 5 × 4 m · stud 2.4",
        metrics: "walls 38.9 m², ceiling 20 m² · 2 coats",
        price: "$1,100",
        badge: "Spoken",
      },
    ],
  },
  {
    at: 23,
    until: 34,
    timeLabel: "0:27",
    stage: "Hallway · 8 × 1.2 m",
    spoken:
      "Hallway, eight by one-two, walls only, ceiling optional at one ninety, four hundred.",
    photoUrl: NZ_IMAGERY.hallway,
    snappedCount: 2,
    pin: null,
    exclGst: 1500,
    gst: 225,
    inclGst: 1725,
    lines: [
      {
        label: "Lounge · 5 × 4 m · stud 2.4",
        metrics: "walls 38.9 m², ceiling 20 m² · 2 coats",
        price: "$1,100",
        badge: "Spoken",
      },
      {
        label: "Hallway · 8 × 1.2 m",
        metrics: "walls 39.7 m² · 2 coats",
        price: "$400",
        badge: "Spoken",
      },
      {
        label: "Optional · Hallway Ceiling",
        metrics: "ceiling 9.6 m² · 2 coats",
        price: "+$190",
        badge: "Optional",
      },
    ],
  },
  {
    at: 34,
    until: 40,
    timeLabel: "0:38",
    stage: "GST & link ready",
    spoken:
      "Done. Square metres calculated, room photos matched, 15% GST itemised, ready to text Sarah from the driveway.",
    photoUrl: NZ_IMAGERY.exterior,
    snappedCount: 2,
    pin: null,
    exclGst: 1500,
    gst: 225,
    inclGst: 1725,
    lines: [
      {
        label: "Lounge · 5 × 4 m · stud 2.4",
        metrics: "walls 38.9 m², ceiling 20 m² · 2 coats",
        price: "$1,100",
        badge: "Spoken",
      },
      {
        label: "Hallway · 8 × 1.2 m",
        metrics: "walls 39.7 m² · 2 coats",
        price: "$400",
        badge: "Spoken",
      },
      {
        label: "Optional · Hallway Ceiling",
        metrics: "ceiling 9.6 m² · 2 coats",
        price: "+$190",
        badge: "Optional",
      },
    ],
  },
];

export default function WalkthroughDemo() {
  const [seconds, setSeconds] = useState(25);
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
    <section
      id="walkthrough"
      aria-label="40-second house walk demo"
      className="walkthrough-panel apple-surface border border-border bg-card p-4 sm:p-9"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          
          <span className="text-[15px] font-medium text-muted-foreground">
            Interactive 40-second walk · 14 Kauri St, Ponsonby
          </span>
        </div>
        <span className="tabular-money rounded-full bg-background px-3.5 py-1.5 text-[13px] font-medium text-foreground">
          {formattedClock}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Camera + Voice Frame */}
        <div className="relative overflow-hidden rounded-[26px] bg-zinc-950 text-white lg:col-span-7 lg:min-h-[440px]">
          <div className="relative aspect-[16/11] w-full overflow-hidden sm:aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto">
            <Image
              src={activeStep.photoUrl}
              alt={activeStep.stage}
              className="h-full w-full object-cover opacity-90 transition-opacity duration-300"
            />
            <div className="absolute inset-x-3 top-3 flex items-center justify-between rounded-full bg-black/55 px-4 py-2 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="text-[13px] font-semibold">{activeStep.stage}</span>
              </div>
              <span className="tabular-money text-[13px] font-semibold text-zinc-200">
                {activeStep.timeLabel}
              </span>
            </div>

            {activeStep.pin && (
              <div
                style={{ left: activeStep.pin.x, top: activeStep.pin.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-[13px] font-bold text-white shadow-md">
                  {activeStep.pin.n}
                </span>
              </div>
            )}

            <div className="absolute inset-x-3 bottom-3 rounded-[20px] bg-black/55 p-4 backdrop-blur-xl">
              <p className="text-[14px] leading-snug text-zinc-100">
                &ldquo;{activeStep.spoken}&rdquo;
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-white/15 pt-2 text-[12px] text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {activeStep.snappedCount}{" "}
                  {activeStep.snappedCount === 1 ? "room snapped" : "rooms snapped"}
                </span>
                <span>Single continuous recording</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Structured Quote Output */}
        <div className="flex flex-col justify-between rounded-[26px] bg-background p-5 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">
                  Kauri Coast Painters
                </p>
                <p className="mt-0.5 text-[17px] font-semibold text-foreground">
                  Sarah Miller
                </p>
                <p className="text-[14px] text-muted-foreground">
                  14 Kauri Street, Ponsonby
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-semibold text-secondary-foreground">
                30% deposit
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {activeStep.lines.length === 0 ? (
                <p className="py-8 text-center text-[15px] text-muted-foreground">
                  Listening for first room dimensions and coats…
                </p>
              ) : (
                activeStep.lines.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-start justify-between gap-2 rounded-2xl bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {line.label}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{line.metrics}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="tabular-money block text-[15px] font-bold text-foreground">
                        {line.price}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {line.badge}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t border-border pt-3 text-[13px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Excl. GST</span>
              <span className="tabular-money">${activeStep.exclGst.toLocaleString("en-NZ")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST (15%)</span>
              <span className="tabular-money">${activeStep.gst.toLocaleString("en-NZ")}</span>
            </div>
            <div className="flex items-baseline justify-between pt-1 text-foreground">
              <span className="text-[14px] font-semibold">Total incl. GST</span>
              <span className="tabular-money text-[21px] font-bold">
                NZ${activeStep.inclGst.toLocaleString("en-NZ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Playback & Step Selector */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayPause}
            className="flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground transition-opacity duration-200 hover:opacity-90"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing
              ? "Pause walk"
              : seconds >= 40
              ? "Replay 40s walk"
              : "Play 40s walk"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setSeconds(0);
            }}
            aria-label="Restart walkthrough"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
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
                className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 ${
                  isCurrent
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:text-foreground"
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