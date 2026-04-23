import { useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";

const CF_SUBDOMAIN = "customer-33brxqrbc8olytg8.cloudflarestream.com";

interface Props {
  cloudflareVideoId?: string | null;
  fallbackUrl?: string | null;
  className?: string;
  /** Show iframe controls (full play UI). Default false → background-style autoplay. */
  controls?: boolean;
  /** Autoplay muted loop (background preview). Default false. */
  loopBackground?: boolean;
  /** Imperative play/pause hook for hover behaviour on Supabase fallback. */
  paused?: boolean;
}

/**
 * Drop-in video player for exercise demos.
 * Uses Cloudflare Stream when a `cloudflareVideoId` is available, otherwise
 * falls back to the raw Supabase video URL via a native <video>.
 */
export const ExerciseVideoPlayer = forwardRef<HTMLVideoElement, Props>(function ExerciseVideoPlayer(
  { cloudflareVideoId, fallbackUrl, className, controls = false, loopBackground = false, paused },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Forward imperative ref
  useEffect(() => {
    if (typeof ref === "function") ref(videoRef.current);
    else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = videoRef.current;
  }, [ref]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused === true) {
      v.pause();
    } else if (paused === false) {
      v.play().catch(() => {});
    }
  }, [paused]);

  if (cloudflareVideoId) {
    const params = new URLSearchParams({
      autoplay: loopBackground ? "true" : "false",
      muted: loopBackground ? "true" : "false",
      loop: loopBackground ? "true" : "false",
      controls: controls ? "true" : "false",
      preload: "auto",
    });
    return (
      <iframe
        src={`https://${CF_SUBDOMAIN}/${cloudflareVideoId}/iframe?${params.toString()}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen={controls}
        className={cn("w-full h-full border-0", className)}
        title="Exercise video"
      />
    );
  }

  if (!fallbackUrl) return null;

  return (
    <video
      ref={videoRef}
      src={fallbackUrl}
      preload="metadata"
      muted={loopBackground}
      autoPlay={loopBackground || controls}
      controls={controls}
      loop={loopBackground}
      playsInline
      className={cn("w-full h-full object-contain bg-black", className)}
    />
  );
});