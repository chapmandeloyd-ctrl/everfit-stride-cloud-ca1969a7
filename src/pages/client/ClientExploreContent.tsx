import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Share2, FileText, Video, Headphones } from "lucide-react";
import { useExploreContentById, useBookmarks, useToggleBookmark } from "@/hooks/useExplore";
import { Button } from "@/components/ui/button";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { LionWatermark } from "@/components/explore/LionWatermark";
import { cn } from "@/lib/utils";

const BG = "hsl(0 0% 4%)";
const SURFACE = "hsl(0 0% 6%)";
const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const HAIRLINE = "hsl(42 70% 55% / 0.25)";

export default function ClientExploreContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = useExploreContentById(id);
  const { data: bookmarks } = useBookmarks();
  const toggle = useToggleBookmark();
  const { updateAvailable } = useAppUpdate();
  const isBookmarked = !!(id && bookmarks?.has(id));

  if (isLoading) {
    return (
      <div className="p-8 text-center" style={{ background: BG, color: MUTED, minHeight: "100vh" }}>
        Loading…
      </div>
    );
  }
  if (!item) {
    return (
      <div className="p-8 text-center" style={{ background: BG, minHeight: "100vh" }}>
        <p style={{ color: MUTED }}>Content not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.subtitle || "",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <UpdateBanner />
      <header
        className="px-4 shrink-0 sticky top-0 z-40"
        style={{
          background: BG,
          borderBottom: `1px solid ${HAIRLINE}`,
          paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)",
        }}
      >
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full"
            style={{ border: `1px solid ${HAIRLINE}`, color: GOLD }}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="h-9 w-9 flex items-center justify-center rounded-full"
              style={{ border: `1px solid ${HAIRLINE}`, color: GOLD }}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => id && toggle.mutate({ contentId: id, isBookmarked })}
              className="h-9 w-9 flex items-center justify-center rounded-full"
              style={{ border: `1px solid ${HAIRLINE}`, color: GOLD }}
              aria-label="Bookmark"
            >
              <Bookmark
                className={cn("h-4 w-4")}
                strokeWidth={1.5}
                fill={isBookmarked ? GOLD : "none"}
              />
            </button>
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-auto"
        style={{ paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom, 0px), 4px))" }}
      >
        {/* Hero */}
        <div
          className="relative aspect-[16/11] flex items-center justify-center overflow-hidden"
          style={{ background: SURFACE, borderBottom: `1px solid ${HAIRLINE}` }}
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(0.15) contrast(1.05)" }}
            />
          ) : (
            <>
              <LionWatermark opacity={0.12} />
              <Icon className="relative h-16 w-16" strokeWidth={1.25} style={{ color: GOLD }} />
            </>
          )}
        </div>

        {/* Title block */}
        <div className="px-6 pt-10 pb-6 text-center space-y-4">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
            {item.category} · {item.type}
          </p>
          <div className="mx-auto h-px w-10" style={{ background: GOLD }} />
          <h1
            className="text-3xl leading-tight tracking-tight"
            style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
          >
            {item.title}
          </h1>
          {item.subtitle && (
            <p className="text-sm max-w-md mx-auto" style={{ color: MUTED }}>
              {item.subtitle}
            </p>
          )}
          {item.author && (
            <p className="text-[10px] uppercase tracking-[0.35em] pt-2" style={{ color: MUTED }}>
              By {item.author}
            </p>
          )}
        </div>

        <div className="mx-auto h-px w-12 my-2" style={{ background: HAIRLINE }} />

        {/* Body */}
        <article className="px-6 py-8 max-w-2xl mx-auto">
          {item.body?.split("\n\n").map((p, i) => (
            <p
              key={i}
              className="text-[15px] leading-[1.8] mb-5"
              style={{ color: IVORY, fontFamily: "Georgia, serif" }}
            >
              {p}
            </p>
          ))}
        </article>
      </main>

      <ClientBottomNav />
    </div>
  );
}
