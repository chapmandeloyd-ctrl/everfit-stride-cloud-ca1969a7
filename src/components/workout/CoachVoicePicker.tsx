import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const COACH_VOICES = [
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica — Warm" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel — Steady" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam — Energetic" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah — Calm" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George — Deep" },
] as const;

export const DEFAULT_COACH_VOICE_ID = COACH_VOICES[0].id;

interface CoachVoicePickerProps {
  value: string | null;
  onChange: (voiceId: string) => void;
  className?: string;
}

export function CoachVoicePicker({ value, onChange, className }: CoachVoicePickerProps) {
  const { toast } = useToast();
  const [previewing, setPreviewing] = useState(false);

  const playPreview = async () => {
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text: "Let's get to work. Three, two, one, go!", voiceId: value || DEFAULT_COACH_VOICE_ID },
      });
      if (error) throw error;
      const base64 = (data as any)?.audioContent;
      if (!base64) throw new Error("No audio returned");
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      await audio.play();
    } catch (e: any) {
      toast({ title: "Preview unavailable", description: e.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <span className="text-muted-foreground">Coach voice:</span>
      <Select value={value || DEFAULT_COACH_VOICE_ID} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COACH_VOICES.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={playPreview} disabled={previewing}>
        {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
