import { useEffect, useRef, useState } from "react";
import { Heart, X, Pencil, Play, Pause, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGoalMotivation } from "@/hooks/useGoalMotivation";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { MyWhyEditDialog } from "@/components/goal-motivation/MyWhyEditDialog";

const BUCKET = "goal-motivation-media";

interface Props {
  goalId?: string | null;
  trainerId?: string | null;
  onClose: () => void;
}

export function SmartPaceWhyView({ goalId, trainerId, onClose }: Props) {
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
      } else setImgUrl(null);
      if (motivation?.why_audio_url) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(motivation.why_audio_url, 60 * 60);
        if (alive) setAudioUrl(data?.signedUrl ?? null);
      } else setAudioUrl(null);
    })();
    return () => { alive = false; };
  }, [motivation?.why_image_url, motivation?.why_audio_url]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  const hasContent =
    !!motivation?.why_text || !!motivation?.why_image_url || !!motivation?.why_audio_url;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-white/80 fill-white/30" />
          <span className="text-sm font-bold text-white uppercase tracking-wide">My Why</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/50" />
        </div>
      ) : !hasContent ? (
        <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-5 text-center space-y-3">
          <Heart className="h-7 w-7 mx-auto text-white/70" />
          <div>
            <p className="font-heading font-bold text-base text-white">Add your Why</p>
            <p className="text-xs text-white/60 mt-1 leading-snug">
              Capture the personal reason behind your goal — text, photo, or a voice memo to yourself.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditOpen(true)}
            className="bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/20"
          >
            <Plus className="h-4 w-4 mr-1" /> Set your Why
          </Button>
        </div>
      ) : (
        <div className="rounded-xl bg-black/30 ring-1 ring-white/10 overflow-hidden">
          {imgUrl && (
            <div
              className="w-full h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${imgUrl})` }}
            />
          )}
          <div className="p-4 space-y-3">
            {motivation?.why_text && (
              <p className="text-sm text-white/90 leading-relaxed italic border-l-2 border-white/20 pl-3">
                "{motivation.why_text}"
              </p>
            )}
            {audioUrl && (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={togglePlay}
                  className="rounded-full bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/20"
                >
                  {playing ? (
                    <><Pause className="h-3.5 w-3.5 mr-1.5" /> Pause</>
                  ) : (
                    <><Play className="h-3.5 w-3.5 mr-1.5" /> Play voice memo</>
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditOpen(true)}
              className="text-white/70 hover:text-white hover:bg-white/10 -ml-2"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </div>
        </div>
      )}

      {clientId && (
        <MyWhyEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          clientId={clientId}
          goalId={goalId}
          trainerId={trainerId}
          existing={motivation ?? null}
        />
      )}
    </div>
  );
}
