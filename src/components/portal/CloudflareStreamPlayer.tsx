import { useEffect, useRef, useState } from "react";

const CF_SUBDOMAIN = "customer-33brxqrbc8olytg8.cloudflarestream.com";

interface Props {
  videoId: string;
  /** Fallback MP4 URL shown if the iframe never reports load. */
  fallbackUrl?: string;
  /** Pixel scale to hide letterboxing. Default 1.05. */
  scale?: number;
  className?: string;
  onReady?: () => void;
}

/**
 * Cloudflare Stream player — adaptive HLS, global CDN, autoplay-muted-loop.
 * Safe on iOS Safari (no native <video> autoplay quirks).
 */
export function CloudflareStreamPlayer({
  videoId,
  fallbackUrl,
  scale = 1.05,
  className = "",
  onReady,
}: Props) {
  const [ready, setReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const thumb = `https://${CF_SUBDOMAIN}/${videoId}/thumbnails/thumbnail.jpg`;

  useEffect(() => {
    // Hard fallback so UI never hangs
    const t = window.setTimeout(() => {
      setReady(true);
      onReady?.();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [videoId, onReady]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <img
        src={thumb}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          ready ? "opacity-0" : "opacity-100"
        }`}
        onError={(e) => {
          if (fallbackUrl) (e.currentTarget as HTMLImageElement).src = fallbackUrl;
        }}
      />
      <iframe
        ref={iframeRef}
        src={`https://${CF_SUBDOMAIN}/${videoId}/iframe?autoplay=true&muted=true&loop=true&controls=false&preload=auto&poster=${encodeURIComponent(thumb)}`}
        onLoad={() => {
          setReady(true);
          onReady?.();
        }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen={false}
        loading="eager"
        title="Cloudflare Stream"
        className={`absolute inset-0 w-full h-full border-0 pointer-events-none transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
      />
    </div>
  );
}
