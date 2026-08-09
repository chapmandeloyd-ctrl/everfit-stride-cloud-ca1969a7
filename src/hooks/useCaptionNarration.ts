import { useCallback, useEffect, useRef } from "react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Optional voice narration for a changing caption string.
 * Fetches TTS audio per unique line, caches it, and plays the newest line
 * (cancelling whatever was speaking). Fully silent + no requests when disabled.
 */
export function useCaptionNarration(text: string, enabled: boolean) {
  const cache = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpoken = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      lastSpoken.current = null;
      return;
    }
    if (!text || text === lastSpoken.current) return;
    lastSpoken.current = text;

    let cancelled = false;
    (async () => {
      try {
        let url = cache.current.get(text);
        if (!url) {
          const res = await fetch(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
            body: JSON.stringify({ text }),
          });
          if (!res.ok) {
            console.error("Narration failed:", res.status, await res.text().catch(() => ""));
            return;
          }
          url = URL.createObjectURL(await res.blob());
          cache.current.set(text, url);
        }
        if (cancelled) return;
        stop();
        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.volume = 1;
        await audio.play().catch(() => {});
      } catch (err) {
        console.error("Narration error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, enabled, stop]);

  // cleanup on unmount
  useEffect(() => {
    const cached = cache.current;
    return () => {
      audioRef.current?.pause();
      cached.forEach((u) => URL.revokeObjectURL(u));
      cached.clear();
    };
  }, []);

  return { stop };
}
