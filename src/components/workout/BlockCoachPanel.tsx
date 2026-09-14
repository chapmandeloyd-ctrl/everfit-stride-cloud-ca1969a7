import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Sparkles, Play, Loader2, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { speakWithCoachVoice } from "@/components/workout/CoachVoicePicker";

const WATER_BREAK_OPTIONS = [
  { value: "0", label: "None" },
  { value: "30", label: "30 sec" },
  { value: "60", label: "1 min" },
  { value: "90", label: "1:30" },
  { value: "120", label: "2 min" },
  { value: "180", label: "3 min" },
];

interface BlockCoachPanelProps {
  blockLabel: string;
  exerciseNames: string[];
  introText?: string;
  onUpdateIntro: (value: string) => void;
  waterBreakSeconds?: number;
  onUpdateWaterBreak?: (seconds: number) => void;
  coachVoiceId?: string | null;
}

export function BlockCoachPanel({
  blockLabel,
  exerciseNames,
  introText,
  onUpdateIntro,
  waterBreakSeconds,
  onUpdateWaterBreak,
  coachVoiceId,
}: BlockCoachPanelProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const spokenText = introText?.trim() || `Next up: ${blockLabel}.`;

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach-script", {
        body: { blockLabel, exercises: exerciseNames },
      });
      if (error) throw error;
      if (data?.text) onUpdateIntro(data.text);
    } catch (e: any) {
      toast({ title: "Couldn't write the intro", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const hear = async () => {
    setSpeaking(true);
    try {
      await speakWithCoachVoice(spokenText, coachVoiceId);
    } catch (e: any) {
      toast({ title: "Playback unavailable", description: e.message, variant: "destructive" });
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="mx-3 mb-2 rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-foreground">
          <Volume2 className="h-3.5 w-3.5" />
          COACH READS ALOUD
        </div>
        <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={hear} disabled={speaking}>
          {speaking ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
          PREVIEW BLOCK
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">BLOCK INTRO</span>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            AI generate
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={hear} disabled={speaking}>
            <Play className="h-3 w-3 mr-1" />
            Hear
          </Button>
        </div>
      </div>

      <Textarea
        value={introText || ""}
        onChange={(e) => onUpdateIntro(e.target.value)}
        placeholder={`Auto: "Next up: ${blockLabel}."`}
        className="min-h-[64px] text-sm bg-background"
      />

      {onUpdateWaterBreak && (
        <div className="flex items-center gap-2">
          <Droplet className="h-3.5 w-3.5 text-sky-500" />
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">WATER BREAK</span>
          <Select
            value={String(waterBreakSeconds ?? 0)}
            onValueChange={(v) => onUpdateWaterBreak(parseInt(v))}
          >
            <SelectTrigger className="h-8 w-28 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WATER_BREAK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">before next block</span>
        </div>
      )}
    </div>
  );
}
