import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Share2, FileText, Video, Headphones } from "lucide-react";
import { useExploreContentById, useBookmarks, useToggleBookmark } from "@/hooks/useExplore";
import { Button } from "@/components/ui/button";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { cn } from "@/lib/utils";

export default function ClientExploreContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = useExploreContentById(id);
  const { data: bookmarks } = useBookmarks();
  const toggle = useToggleBookmark();
  const { updateAvailable } = useAppUpdate();
  const isBookmarked = !!(id && bookmarks?.has(id));

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (!item) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Content not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const Icon = item.type === "video" ? Video : item.type === "audio" ? Headphones : FileText;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.subtitle || "", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UpdateBanner />
      <header
        className="bg-card border-b border-border px-4 shrink-0 sticky top-0 z-40"
        style={{ paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)" }}
      >
        <div className="flex items-center justify-between h-14">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => id && toggle.mutate({ contentId: id, isBookmarked })}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
            aria-label="Bookmark"
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-foreground")} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto" style={{ paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom, 0px), 4px))" }}>
        <div className="px-5 pt-6 pb-4 text-center space-y-3">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-foreground text-background">
            <Icon className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">{item.title}</h1>
          {item.author && <p className="text-base font-semibold text-foreground">{item.author}</p>}
          <button
            onClick={handleShare}
            className="absolute right-5 mt-2 text-muted-foreground"
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("aspect-[16/10] flex items-center justify-center", categoryBg(item.category))}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <Icon className="h-20 w-20 text-foreground/40" />
          )}
        </div>

        <article className="px-5 py-6 prose prose-neutral dark:prose-invert max-w-none">
          {item.body?.split("\n\n").map((p, i) => (
            <p key={i} className="text-base leading-relaxed text-foreground/90 mb-4">
              {p}
            </p>
          ))}
        </article>
      </main>

      <ClientBottomNav />
    </div>
  );
}

function categoryBg(cat: string): string {
  switch (cat) {
    case "fuel": return "bg-sky-100 dark:bg-sky-950/40";
    case "train": return "bg-orange-100 dark:bg-orange-950/40";
    case "restore": return "bg-purple-100 dark:bg-purple-950/40";
    default: return "bg-muted";
  }
}
