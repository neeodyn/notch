import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, RefreshCw, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AudioWaveform from "@/components/notch/AudioWaveform";
import { clearLocalCapture, loadLocalCapture, saveLocalCapture } from "@/lib/captureStore";
import { fillQuoteFromCaptureFn, transcribeCaptureFn } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/app/q/$id/capture")({
  head: () => ({ meta: [{ title: "Walk the yard — Notch" }] }),
  component: CaptureScreen,
});

function pickRecorderMime() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  if (window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (window.MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function CaptureScreen() {
  const { id: quoteId } = Route.useParams();
  const navigate = useNavigate();
  const runTranscribe = useServerFn(transcribeCaptureFn);
  const runFill = useServerFn(fillQuoteFromCaptureFn);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const startTimeRef = useRef(0);

  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackTranscript, setFallbackTranscript] = useState("");
  const [elapsedS, setElapsedS] = useState(0);
  const [snaps, setSnaps] = useState([]);
  const [processingWord, setProcessingWord] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [hasSavedLocalRecovery, setHasSavedLocalRecovery] = useState(false);

  // Start single audio+video stream immediately on mount
  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function initCapture() {
      const existingLocal = await loadLocalCapture(quoteId).catch(() => null);
      if (existingLocal && (existingLocal.audioBlob || existingLocal.manualTranscript)) {
        setHasSavedLocalRecovery(true);
        if (existingLocal.photos?.length) setSnaps(existingLocal.photos);
      }

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);

        // MediaRecorder on the audio track ONLY
        const audioOnlyStream = new MediaStream(media.getAudioTracks());
        const mimeType = pickRecorderMime();
        const recorder = mimeType
          ? new MediaRecorder(audioOnlyStream, { mimeType })
          : new MediaRecorder(audioOnlyStream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.start(500);
        recorderRef.current = recorder;
        startTimeRef.current = Date.now();

        timerId = window.setInterval(() => {
          setElapsedS(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 500);
      } catch {
        // Headless browser or denied camera/mic -> indoor text/photo fallback
        if (!cancelled) {
          setFallbackMode(true);
          startTimeRef.current = Date.now();
          timerId = window.setInterval(() => {
            setElapsedS(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }, 1000);
        }
      }
    }

    initCapture();

    return () => {
      cancelled = true;
      if (timerId) window.clearInterval(timerId);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [quoteId]);

  // Snap current video frame onto canvas (JPEG max 1600px @ 0.82), never opening native camera
  async function handleSnapVideoFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const takenAtS = Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10;
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    const previewUrl = canvas.toDataURL("image/jpeg", 0.5);
    const snapEntry = {
      localId: `snap-${Date.now()}-${snaps.length + 1}`,
      blob,
      previewUrl,
      takenAtS,
      fileUri: "",
    };

    const nextSnaps = [...snaps, snapEntry];
    setSnaps(nextSnaps);

    const prevLocal = (await loadLocalCapture(quoteId).catch(() => null)) || { quoteId };
    await saveLocalCapture({
      ...prevLocal,
      quoteId,
      photos: nextSnaps,
    }).catch(() => {});
  }

  async function runUploadAndPipeline(localData) {
    setUploadError("");
    try {
      let working = { ...localData };

      // 1. Upload audio if needed
      setProcessingWord("Listening…");
      if (working.audioBlob && !working.uploadedAudioUri) {
        const ext = (working.audioMime || "").includes("mp4") ? "m4a" : "webm";
        const audioFile = new File([working.audioBlob], `yard-${quoteId}.${ext}`, {
          type: working.audioMime || "audio/webm",
        });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: audioFile });
        working.uploadedAudioUri = file_uri;
        await saveLocalCapture(working).catch(() => {});
      }

      // 2. Upload snapped photos if needed
      const updatedPhotos = [];
      for (const p of working.photos || []) {
        if (p.fileUri) {
          updatedPhotos.push(p);
        } else if (p.blob) {
          const photoFile = new File([p.blob], `${p.localId}.jpg`, { type: "image/jpeg" });
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: photoFile });
          const savedP = { ...p, fileUri: file_uri };
          updatedPhotos.push(savedP);
        }
      }
      working.photos = updatedPhotos;
      await saveLocalCapture(working).catch(() => {});

      // 3. Transcribe
      const transcribed = await runTranscribe({
        data: {
          quoteId,
          fileUri: working.uploadedAudioUri || "",
          durationS: working.durationS || Math.max(5, elapsedS),
          manualTranscript: working.manualTranscript || "",
          kind: "capture",
        },
      });

      // 4. Fill + Match Photos + Price
      setProcessingWord("Writing it up…");
      await new Promise((r) => setTimeout(r, 220));
      setProcessingWord("Matching photos…");
      const fillPromise = runFill({
        data: {
          quoteId,
          recordingId: transcribed.recordingId,
          segments: transcribed.segments || [],
          photos: updatedPhotos
            .filter((p) => p.fileUri)
            .map((p) => ({
              file_uri: p.fileUri,
              taken_at_s: p.takenAtS || 0,
            })),
        },
      });
      await new Promise((r) => setTimeout(r, 300));
      setProcessingWord("Pricing…");
      await fillPromise;

      await clearLocalCapture(quoteId).catch(() => {});
      await navigate({
        to: "/app/q/$id/check",
        params: { id: quoteId },
      });
    } catch (err) {
      setProcessingWord("");
      setUploadError(err?.message || "Upload interrupted. Your recording is saved on this device.");
      setHasSavedLocalRecovery(true);
    }
  }

  async function handleDone() {
    const durationS = Math.max(3, Math.round((Date.now() - startTimeRef.current) / 1000));
    let audioBlob = null;
    let audioMime = "audio/webm";

    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      audioMime = rec.mimeType || "audio/webm";
      audioBlob = await new Promise((resolve) => {
        rec.onstop = () => resolve(new Blob(audioChunksRef.current, { type: audioMime }));
        rec.stop();
      });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    // Save to IndexedDB FIRST before network upload
    const localPayload = {
      quoteId,
      audioBlob,
      audioMime,
      durationS,
      manualTranscript: fallbackMode ? fallbackTranscript.trim() : "",
      photos: snaps,
      uploadedAudioUri: "",
    };
    await saveLocalCapture(localPayload).catch(() => {});
    await runUploadAndPipeline(localPayload);
  }

  async function handleRetrySaved() {
    const saved = await loadLocalCapture(quoteId);
    if (!saved) return;
    await runUploadAndPipeline(saved);
  }

  const mins = Math.floor(elapsedS / 60);
  const secs = String(elapsedS % 60).padStart(2, "0");

  // Full-screen Progress Words state after Done
  if (processingWord || uploadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        {processingWord ? (
          <div className="space-y-3">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-[26px] font-bold tracking-[-0.02em]">{processingWord}</p>
            <p className="text-[15px] text-zinc-400">Saved locally first so nothing gets lost</p>
          </div>
        ) : (
          <div className="max-w-sm space-y-4 rounded-[20px] border border-white/15 bg-zinc-900 p-6">
            <p className="text-[19px] font-semibold text-white">Saved on your phone</p>
            <p className="text-[15px] text-zinc-300">{uploadError}</p>
            <button
              type="button"
              onClick={handleRetrySaved}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[17px] font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Retry upload</span>
            </button>
            <Link
              to="/app/q/$id/check"
              params={{ id: quoteId }}
              className="flex min-h-[44px] items-center justify-center text-[15px] text-zinc-400 hover:text-white"
            >
              Skip to manual quote editor
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-zinc-950 text-white">
      {/* Full-screen live camera stream */}
      {!fallbackMode && (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 safe-top sm:px-6">
        <Link
          to="/app"
          aria-label="Cancel capture"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-md"
        >
          <X className="h-5 w-5" />
        </Link>

        <div className="flex items-center gap-3 rounded-full bg-black/65 px-4 py-2 backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="tabular-money text-[16px] font-semibold">
            {mins}:{secs}
          </span>
          <AudioWaveform stream={stream} active={cameraReady} barCount={12} />
        </div>

        <div className="w-11" />
      </div>

      {/* Fallback mode when device has no camera/mic (e.g. desktop test environment) */}
      {fallbackMode && (
        <div className="relative z-10 mx-auto my-auto w-full max-w-lg px-4">
          <div className="space-y-4 rounded-[20px] border border-white/15 bg-zinc-900 p-5">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-emerald-400">
                Camera or microphone unavailable
              </p>
              <h1 className="mt-1 text-[22px] font-bold">Describe the yard walk</h1>
              <p className="mt-1 text-[14px] text-zinc-300">
                On an iPhone outdoors, your rear camera and mic stream here automatically. Type what you would say on
                the walk to test the full quote builder.
              </p>
            </div>

            <textarea
              rows={5}
              value={fallbackTranscript}
              onChange={(e) => setFallbackTranscript(e.target.value)}
              placeholder="Client is Mark Rivera at 214 Cedar Bend Rd, phone 512-555-0188. First tree is a 55-foot live oak over the driveway, crown reduction and haul brush, twelve hundred. Second tree is a dead 35-foot pine by the back fence, remove it for eight fifty, grind stump."
              className="w-full rounded-2xl border border-white/15 bg-zinc-950 p-3.5 text-[16px] text-white placeholder:text-zinc-500"
            />

            {hasSavedLocalRecovery && (
              <button
                type="button"
                onClick={handleRetrySaved}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-[14px] font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Resume saved recording on this device</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Thumb-Zone Controls */}
      <div className="relative z-10 bg-black/70 px-4 pb-6 pt-4 backdrop-blur-md safe-bottom sm:px-6">
        {/* Numbered thumbnails strip */}
        {snaps.length > 0 && (
          <div className="mx-auto mb-4 flex max-w-lg gap-2.5 overflow-x-auto pb-1">
            {snaps.map((snap, idx) => (
              <div key={snap.localId} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/40">
                <img src={snap.previewUrl} alt={`Tree ${idx + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div className="w-24 text-left">
            <p className="text-[13px] font-medium text-zinc-300">
              {snaps.length === 0 ? "Keep talking" : `${snaps.length} snapped`}
            </p>
          </div>

          {/* 88x88 Snap button (captures live video frame without opening native camera) */}
          {!fallbackMode ? (
            <button
              type="button"
              onClick={handleSnapVideoFrame}
              aria-label="Snap tree photo"
              className="flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-full border-4 border-white bg-white/20 text-white active:scale-95"
            >
              <Camera className="h-7 w-7" />
              <span className="text-[12px] font-semibold">Snap</span>
            </button>
          ) : (
            <div className="h-[88px] w-4" />
          )}

          {/* 56px Done button */}
          <button
            type="button"
            onClick={handleDone}
            disabled={fallbackMode && !fallbackTranscript.trim()}
            className="flex h-14 min-w-[104px] items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground disabled:opacity-45"
          >
            <Check className="h-5 w-5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}