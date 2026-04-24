import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Step = { label: string; status: "idle" | "running" | "ok" | "fail"; detail?: string };

const initial: Step[] = [
  { label: "1. Fetch sound URL", status: "idle" },
  { label: "2. Load audio (HTMLAudio)", status: "idle" },
  { label: "3. Play", status: "idle" },
  { label: "4. Pause", status: "idle" },
];

export function RestorePlaybackTest() {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [running, setRunning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const update = (i: number, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const run = async () => {
    setRunning(true);
    setSteps(initial.map((s) => ({ ...s })));
    let url = "";

    // 1. Fetch a sound URL from DB
    update(0, { status: "running" });
    try {
      const { data, error } = await supabase
        .from("vibes_sounds")
        .select("name, audio_url")
        .not("audio_url", "is", null)
        .limit(1)
        .single();
      if (error) throw error;
      if (!data?.audio_url) throw new Error("No audio_url in row");
      url = data.audio_url;
      update(0, { status: "ok", detail: `${data.name} → ${url.slice(0, 60)}…` });
    } catch (e: any) {
      update(0, { status: "fail", detail: e?.message ?? String(e) });
      setRunning(false);
      return;
    }

    // 2. Load audio
    update(1, { status: "running" });
    let audio: HTMLAudioElement;
    try {
      audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.src = url;
      audioRef.current = audio;
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          audio.removeEventListener("canplay", onReady);
          audio.removeEventListener("error", onErr);
          resolve();
        };
        const onErr = () => {
          audio.removeEventListener("canplay", onReady);
          audio.removeEventListener("error", onErr);
          reject(new Error(`MediaError code ${audio.error?.code ?? "?"}`));
        };
        audio.addEventListener("canplay", onReady);
        audio.addEventListener("error", onErr);
        setTimeout(() => reject(new Error("Timeout after 8s")), 8000);
      });
      update(1, { status: "ok", detail: `duration=${audio.duration.toFixed(1)}s` });
    } catch (e: any) {
      update(1, { status: "fail", detail: e?.message ?? String(e) });
      setRunning(false);
      return;
    }

    // 3. Play
    update(2, { status: "running" });
    try {
      await audio.play();
      update(2, { status: "ok", detail: `playing, currentTime=${audio.currentTime.toFixed(2)}s` });
    } catch (e: any) {
      update(2, { status: "fail", detail: e?.message ?? String(e) });
      setRunning(false);
      return;
    }

    // 4. Pause after 1.2s
    update(3, { status: "running" });
    await new Promise((r) => setTimeout(r, 1200));
    try {
      audio.pause();
      update(3, { status: "ok", detail: `paused at ${audio.currentTime.toFixed(2)}s` });
    } catch (e: any) {
      update(3, { status: "fail", detail: e?.message ?? String(e) });
    }

    setRunning(false);
  };

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    audioRef.current = null;
    setSteps(initial.map((s) => ({ ...s })));
    setRunning(false);
  };

  const dot = (status: Step["status"]) => {
    if (status === "ok") return "bg-emerald-400";
    if (status === "fail") return "bg-red-500";
    if (status === "running") return "bg-amber-400 animate-pulse";
    return "bg-white/20";
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-white/80 text-sm font-medium">Playback Self-Test</div>
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={running}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs font-medium border border-emerald-500/30 disabled:opacity-50"
          >
            {running ? "Running…" : "Run Test"}
          </button>
          <button
            onClick={stop}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 text-xs font-medium border border-white/10"
          >
            Reset
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-1 h-2 w-2 rounded-full ${dot(s.status)}`} />
            <div className="flex-1">
              <div className="text-white/80">{s.label}</div>
              {s.detail && (
                <div className={`mt-0.5 text-[10px] break-all ${s.status === "fail" ? "text-red-300" : "text-white/40"}`}>
                  {s.detail}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="text-[10px] text-white/30">
        Bypasses the mixer — uses raw HTMLAudio to isolate file vs engine vs browser issues.
      </div>
    </div>
  );
}