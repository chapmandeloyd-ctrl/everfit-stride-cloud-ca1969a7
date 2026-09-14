import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface CoachVoice {
  id: string;
  name: string;
  tagline: string;
  gender: "female" | "male";
}

export const COACH_VOICES: CoachVoice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", tagline: "Warm, friendly, natural", gender: "female" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", tagline: "Young, energetic, upbeat", gender: "female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", tagline: "Soft, encouraging, calm", gender: "female" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", tagline: "Conversational, clear", gender: "female" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", tagline: "British, authoritative", gender: "female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", tagline: "Warm, mature, confident", gender: "female" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", tagline: "Confident, energetic", gender: "male" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", tagline: "Mature, authoritative", gender: "male" },
];

export const DEFAULT_COACH_VOICE_ID = COACH_VOICES[0].id;

export async function speakWithCoachVoice(text: string, voiceId?: string | null) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || supabaseKey;
  const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, voiceId: voiceId || DEFAULT_COACH_VOICE_ID }),
  });
  if (!response.ok) throw new Error("Voice playback unavailable right now.");
  const blob = await response.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  await audio.play();
  return audio;
}

interface CoachVoicePickerProps {
  value: string | null;
  onChange: (voiceId: string) => void;
  className?: string;
}

export function CoachVoicePicker({ value, onChange, className }: CoachVoicePickerProps) {
  const { toast } = useToast();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const selected = value || DEFAULT_COACH_VOICE_ID;

  const playSample = async (voice: CoachVoice) => {
    setPreviewing(voice.id);
    try {
      await speakWithCoachVoice(
        `Hi, I'm ${voice.name}. Let's get to work. Three, two, one, go!`,
        voice.id,
      );
    } catch (e: any) {
      toast({ title: "Preview unavailable", description: e.message, variant: "destructive" });
    } finally {
      setPreviewing(null);
    }
  };

  const renderGroup = (label: string, gender: "female" | "male") => (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground border-b pb-1">
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {COACH_VOICES.filter((v) => v.gender === gender).map((v) => {
          const isSelected = selected === v.id;
          return (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => onChange(v.id)}
              onKeyDown={(e) => e.key === "Enter" && onChange(v.id)}
              className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.tagline}</p>
                </div>
                <span
                  className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full mt-2 h-8 text-xs"
                disabled={previewing === v.id}
                onClick={(e) => {
                  e.stopPropagation();
                  playSample(v);
                }}
              >
                {previewing === v.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                )}
                Play sample
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <div>
        <p className="text-xs font-semibold tracking-wide">COACH VOICE</p>
        <p className="text-xs text-muted-foreground">Choose the voice that will guide your training</p>
      </div>
      {renderGroup("FEMALE COACHES", "female")}
      {renderGroup("MALE COACHES", "male")}
    </div>
  );
}
