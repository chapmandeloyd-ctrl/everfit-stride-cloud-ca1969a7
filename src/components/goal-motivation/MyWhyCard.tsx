import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Pencil, Play, Pause, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGoalMotivation } from "@/hooks/useGoalMotivation";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { MyWhyEditDialog } from "./MyWhyEditDialog";
import { cn } from "@/lib/utils";

interface Props {
  goalId?: string | null;
  trainerId?: string | null;
  /** "compact" used on dashboard, "full" used on detail page */
  variant?: "compact" | "full";
  className?: string;
}

const BUCKET = "goal-motivation-media";

export function MyWhyCard({ goalId, trainerId, variant = "compact", className }: Props) {
  const clientId = useEffectiveClientId();
  const { data: motivation, isLoading } = useGoalMotivation(goalId);
  const [editOpen, setEditOpen] = useState(false);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (motivation?.why_image_url) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(motivation.why_image_url, 60 * 60);
        if (alive) setImgUrl(data?.signedUrl ?? null);
      } else {
        setImgUrl(null);
      }
      if (motivation?.why_audio_url) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(motivation.why_audio_url, 60 * 60);
        if (alive) setAudioUrl(data?.signedUrl ?? null);
      } else {
        setAudioUrl(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [motivation?.why_image_url, motivation?.why_audio_url]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  if (isLoading || !clientId) {
    return (
      <Card className={cn("animate-pulse h-32 bg-muted/30", className)} />
    );
  }

  const hasContent =
    !!motivation?.why_text || !!motivation?.why_image_url || !!motivation?.why_audio_url;

  // Empty state — invite the user to set a Why
  if (!hasContent) {
    return (
      <>
        <Card
          className={cn(
            "border-dashed border-2 border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors",
            className
          )}
          onClick={() => setEditOpen(true)}
        >
          <CardContent className="p-5 text-center">
            <Heart className="h-7 w-7 mx-auto text-primary mb-2" />
            <p className="font-heading font-bold text-base mb-1">Add your Why</p>
            <p className="text-xs text-muted-foreground mb-3">
              Capture the personal reason behind your goal — text, photo, or a voice memo to yourself.
            </p>
            <Button size="sm" variant="default">
              <Plus className="h-4 w-4 mr-1" /> Set your Why
            </Button>
          </CardContent>
        </Card>
        <MyWhyEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          clientId={clientId}
          goalId={goalId}
          trainerId={trainerId}
          existing={null}
        />
      </>
    );
  }

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-background relative",
          className
        )}
      >
        {imgUrl && (
          <div
            className={cn(
              "w-full bg-cover bg-center",
              variant === "compact" ? "h-32" : "h-48"
            )}
            style={{ backgroundImage: `url(${imgUrl})` }}
          />
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-primary">
              <Heart className="h-4 w-4 fill-primary" />
              <span className="text-xs font-bold uppercase tracking-wider">My Why</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 -mr-1 -mt-1"
              onClick={() => setEditOpen(true)}
              aria-label="Edit My Why"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          {motivation?.why_text && (
            <p
              className={cn(
                "text-foreground leading-relaxed",
                variant === "compact" ? "text-sm line-clamp-3" : "text-base"
              )}
            >
              "{motivation.why_text}"
            </p>
          )}

          {audioUrl && (
            <div className="flex items-center gap-3 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={togglePlay}
                className="rounded-full"
              >
                {playing ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Play voice memo
                  </>
                )}
              </Button>
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <MyWhyEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        clientId={clientId}
        goalId={goalId}
        trainerId={trainerId}
        existing={motivation}
      />
    </>
  );
}
