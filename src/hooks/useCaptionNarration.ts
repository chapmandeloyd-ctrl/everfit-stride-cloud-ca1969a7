import { useCallback, useEffect, useRef, useState } from "react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Global registry so only ONE narration audio element can play at a time,
 * even when multiple components mount the hook (e.g. page-level script +
 * in-demo captions). Starting a new line silences every other one.
 */
const activeAudios = new Set<HTMLAudioElement>();
function silenceOthers(current: HTMLAudioElement | null) {
  activeAudios.forEach((a) => {
    if (a !== current) {
      a.pause();
      a.currentTime = 0;
    }
  });
}

/**
 * Optional voice narration for a changing caption string.
 * Fetches TTS audio per unique line, caches it, and plays the newest line
 * (cancelling whatever was speaking). Fully silent + no requests when disabled.
 */
export function useCaptionNarration(text: string, enabled: boolean) {
  const cache = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpoken = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isComplete, setIsComplete] = useState(!enabled || !text);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      lastSpoken.current = null;
      setIsLoading(false);
      setIsComplete(true);
      return;
    }
    if (!text) {
      stop();
      lastSpoken.current = null;
      setIsComplete(true);
      return;
    }
    if (text === lastSpoken.current) return;
    lastSpoken.current = text;
    setIsLoading(true);
    setIsSpeaking(false);
    setIsComplete(false);

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
            if (!cancelled) {
              setIsLoading(false);
              setIsComplete(true);
            }
            return;
          }
          url = URL.createObjectURL(await res.blob());
          cache.current.set(text, url);
        }
        if (cancelled) return;
        stop();
        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        activeAudios.add(audio);
        silenceOthers(audio);
        audio.src = url;
        audio.volume = 1;
        audio.onplay = () => {
          silenceOthers(audio);
          if (cancelled) return;
          setIsLoading(false);
          setIsSpeaking(true);
        };
        audio.onended = () => {
          if (cancelled) return;
          setIsSpeaking(false);
          setIsComplete(true);
        };
        audio.onerror = () => {
          if (cancelled) return;
          setIsLoading(false);
          setIsSpeaking(false);
          setIsComplete(true);
        };
        await audio.play().catch(() => {
          if (cancelled) return;
          setIsLoading(false);
          setIsComplete(true);
        });
      } catch (err) {
        console.error("Narration error:", err);
        if (!cancelled) {
          setIsLoading(false);
          setIsSpeaking(false);
          setIsComplete(true);
        }
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
      if (audioRef.current) {
        audioRef.current.pause();
        activeAudios.delete(audioRef.current);
      }
      cached.forEach((u) => URL.revokeObjectURL(u));
      cached.clear();
    };
  }, []);

  return { stop, isLoading, isSpeaking, isComplete };
}
