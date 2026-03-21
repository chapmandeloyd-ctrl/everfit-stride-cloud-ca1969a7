import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, Dumbbell, Trophy, AlertTriangle } from "lucide-react";

interface WorkoutSummaryProps {
  sessionId: string;
  workoutName: string;
  durationSeconds: number;
  startedAt: string;
  completedAt: string;
  isPartial: boolean;
  setLogs: Record<string, { reps: string; weight: string; completed: boolean }>;
  sections: any[];
  onClose: () => void;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

export function WorkoutSummary({
  workoutName,
  durationSeconds,
  isPartial,
  setLogs,
  sections,
  onClose,
}: WorkoutSummaryProps) {
  // Calculate stats
  const totalSets = Object.keys(setLogs).length;
  const completedSets = Object.values(setLogs).filter((l) => l.completed).length;
  const totalVolume = Object.values(setLogs).reduce((sum, l) => {
    const reps = parseInt(l.reps) || 0;
    const weight = parseFloat(l.weight) || 0;
    return sum + reps * weight;
  }, 0);

  const exerciseNames = new Set<string>();
  sections.forEach((sec: any) =>
    sec.exercises?.forEach((ex: any) => exerciseNames.add(ex.exercise_name))
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-lg space-y-6 py-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mx-auto">
            {isPartial ? (
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            ) : (
              <Trophy className="h-10 w-10 text-primary" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {isPartial ? "Workout Ended Early" : "Workout Complete!"}
          </h1>
          <p className="text-muted-foreground">{workoutName}</p>
          {isPartial && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Partial Session
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{formatDuration(durationSeconds)}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{completedSets}/{totalSets}</p>
              <p className="text-xs text-muted-foreground">Sets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xl font-bold">{totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}` : "—"}</p>
              <p className="text-xs text-muted-foreground">Volume (lbs)</p>
            </CardContent>
          </Card>
        </div>

        {/* Exercise Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exercise Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((section: any, sIdx: number) => (
              <div key={section.id}>
                <p className="text-sm font-semibold text-foreground mb-2">{section.name}</p>
                {section.exercises?.map((ex: any, eIdx: number) => {
                  // Gather all logs for this exercise
                  const exerciseLogs: { set: number; reps: string; weight: string; completed: boolean }[] = [];
                  const isGrouped = ["superset", "circuit"].includes(section.section_type);
                  
                  if (isGrouped) {
                    for (let r = 1; r <= (section.rounds || 1); r++) {
                      const key = `${sIdx}-${eIdx}-${r}-1`;
                      if (setLogs[key]) {
                        exerciseLogs.push({ set: r, ...setLogs[key] });
                      }
                    }
                  } else {
                    for (let s = 1; s <= (ex.sets || 1); s++) {
                      const key = `${sIdx}-${eIdx}-1-${s}`;
                      if (setLogs[key]) {
                        exerciseLogs.push({ set: s, ...setLogs[key] });
                      }
                    }
                  }

                  return (
                    <div key={ex.id} className="ml-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        {ex.exercise_image ? (
                          <img src={ex.exercise_image} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {ex.exercise_name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        <p className="text-sm font-medium">{ex.exercise_name}</p>
                      </div>
                      {exerciseLogs.length > 0 ? (
                        <div className="ml-10 space-y-1">
                          {exerciseLogs.map((log) => (
                            <div key={log.set} className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="w-12">Set {log.set}</span>
                              <span>{log.reps || "—"} reps</span>
                              <span>{log.weight ? `${log.weight} lbs` : "—"}</span>
                              {log.completed && <CheckCircle2 className="h-3 w-3 text-primary" />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-10 text-xs text-muted-foreground italic">No data logged</p>
                      )}
                    </div>
                  );
                })}
                {sIdx < sections.length - 1 && <Separator className="my-3" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Close Button */}
        <Button onClick={onClose} className="w-full" size="lg">
          Done
        </Button>
      </div>
    </div>
  );
}
