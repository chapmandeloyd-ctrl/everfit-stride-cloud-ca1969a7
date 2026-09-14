import { useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { speakWithCoachVoice } from "@/components/workout/CoachVoicePicker";

export type ExerciseSideMode = "none" | "sequential" | "alternating";

interface ExerciseCoachCuesProps {
  exerciseName: string;
  sets: number;
  reps: number | null;
  workSeconds: number | null;
  sideMode: ExerciseSideMode;
  startCue: string;
  midCue: string;
  switchCue: string;
  coachVoiceId?: string | null;
  onChange: (updates: {
    side_mode?: ExerciseSideMode;
    form_cue_start?: string;
    form_cue_mid?: string;
    form_cue_switch?: string;
  }) => void;
}

const spokenDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} minutes ${remainder} seconds` : `${minutes} minutes`;
};

export function ExerciseCoachCues({
  exerciseName,
  sets,
  reps,
  workSeconds,
  sideMode,
  startCue,
  midCue,
  switchCue,
  coachVoiceId,
  onChange,
}: ExerciseCoachCuesProps) {
  const [playing, setPlaying] = useState<string | null>(null);
  const summary = workSeconds
    ? `${exerciseName} for ${spokenDuration(workSeconds)}.`
    : sideMode === "sequential"
      ? `${exerciseName}, ${sets} ${sets === 1 ? "set" : "sets"} of ${reps || 1} per side. Right side first.`
      : `${exerciseName}, ${sets} ${sets === 1 ? "set" : "sets"} of ${reps || 1}.`;

  const play = async (key: string, text: string) => {
    if (!text.trim() || playing) return;
    setPlaying(key);
    try {
      await speakWithCoachVoice(text, coachVoiceId || undefined);
    } finally {
      setPlaying(null);
    }
  };

  const previewText = `${summary}${startCue.trim() ? ` ${startCue.trim()}.` : ""} Go.`;

  return (
    <div className="mx-3 mb-3 rounded-md border border-primary/30 bg-primary/5 p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-primary">
          <Volume2 className="h-3 w-3" /> Coach Cues
        </div>
        <Button type="button" size="sm" className="h-7 px-2 text-[10px]" disabled={!!playing} onClick={() => play("preview", previewText)}>
          <Play className="mr-1 h-3 w-3 fill-current" /> Preview
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Side</span>
        <Select
          value={sideMode}
          onValueChange={(value: ExerciseSideMode) => onChange({
            side_mode: value,
            form_cue_switch: value === "sequential" && !switchCue ? "Switch to your left side" : switchCue,
          })}
        >
          <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Both sides together</SelectItem>
            <SelectItem value="sequential">Right side then left side</SelectItem>
            <SelectItem value="alternating">Alternate right / left</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {[
        { key: "start", value: startCue, placeholder: "Before go: e.g. keep your back flat", field: "form_cue_start" as const },
        { key: "mid", value: midCue, placeholder: "Mid-exercise: e.g. halfway, stay tight", field: "form_cue_mid" as const },
        ...(sideMode === "sequential" ? [{ key: "switch", value: switchCue, placeholder: "Switch cue: e.g. now left side, same form", field: "form_cue_switch" as const }] : []),
      ].map((cue) => (
        <div key={cue.key} className="flex items-center gap-1.5">
          <Input value={cue.value} onChange={(event) => onChange({ [cue.field]: event.target.value })} placeholder={cue.placeholder} className="h-8 text-xs" />
          <Button type="button" variant="secondary" size="icon" className="h-8 w-8 shrink-0" disabled={!cue.value.trim() || !!playing} onClick={() => play(cue.key, cue.value)} aria-label={`Hear ${cue.key} cue`}>
            <Play className="h-3 w-3 fill-current" />
          </Button>
        </div>
      ))}
    </div>
  );
}