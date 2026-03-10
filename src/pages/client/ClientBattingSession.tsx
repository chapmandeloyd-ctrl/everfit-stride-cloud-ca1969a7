import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ContactResult = "solid" | "weak" | "miss" | "line_drive" | "fly_ball" | "ground_ball";

export default function ClientBattingSession() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const [swings, setSwings] = useState<ContactResult[]>([]);
  const [fatigue, setFatigue] = useState(0);
  const [confidenceBefore, setConfidenceBefore] = useState(0);
  const [confidenceAfter, setConfidenceAfter] = useState(0);
  const [focusArea, setFocusArea] = useState("general");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startTime] = useState(new Date().toISOString());

  const solidContacts = swings.filter((s) => s === "solid").length;
  const weakContacts = swings.filter((s) => s === "weak").length;
  const misses = swings.filter((s) => s === "miss").length;
  const lineDrives = swings.filter((s) => s === "line_drive").length;
  const flyBalls = swings.filter((s) => s === "fly_ball").length;
  const groundBalls = swings.filter((s) => s === "ground_ball").length;

  const addSwing = (type: ContactResult) => {
    setSwings((prev) => [...prev, type]);
  };

  const undoLast = () => {
    setSwings((prev) => prev.slice(0, -1));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("batting_sessions").insert({
        client_id: clientId!,
        session_type: focusArea,
        total_swings: swings.length,
        solid_contacts: solidContacts,
        weak_contacts: weakContacts,
        misses,
        line_drives: lineDrives,
        fly_balls: flyBalls,
        ground_balls: groundBalls,
        fatigue,
        confidence_before: confidenceBefore,
        confidence_after: confidenceAfter,
        contact_quality: swings.length > 0 ? Math.round((solidContacts / swings.length) * 100) : 0,
        focus_area: focusArea,
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: "completed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batting-sessions"] });
      toast.success("Session saved!");
      navigate("/client/labs/diamond");
    },
    onError: () => toast.error("Failed to save session"),
  });

  if (!sessionStarted) {
    return (
      <ClientLayout>
        <div className="p-4 space-y-4 pb-24">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/client/labs/diamond")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">New Batting Session</h1>
          </div>

          {/* Pre-session sliders (default to 0) */}
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-5">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Focus Area</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {["general", "contact", "power", "oppo-field"].map((area) => (
                    <Button
                      key={area}
                      size="sm"
                      variant={focusArea === area ? "default" : "outline"}
                      onClick={() => setFocusArea(area)}
                      className="text-xs capitalize"
                    >
                      {area}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Confidence Level: {confidenceBefore}
                </label>
                <Slider
                  value={[confidenceBefore]}
                  onValueChange={([v]) => setConfidenceBefore(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>

              <Button className="w-full h-12 font-bold" onClick={() => setSessionStarted(true)}>
                Start Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Swing counter */}
        <div className="text-center">
          <p className="text-5xl font-black tabular-nums">{swings.length}</p>
          <p className="text-xs font-bold uppercase text-muted-foreground mt-1">Total Swings</p>
        </div>

        {/* Quick-log buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            className="h-16 text-xs font-bold bg-emerald-600 hover:bg-emerald-700"
            onClick={() => addSwing("solid")}
          >
            Solid<br />({solidContacts})
          </Button>
          <Button
            className="h-16 text-xs font-bold bg-amber-600 hover:bg-amber-700"
            onClick={() => addSwing("weak")}
          >
            Weak<br />({weakContacts})
          </Button>
          <Button
            className="h-16 text-xs font-bold bg-red-600 hover:bg-red-700"
            onClick={() => addSwing("miss")}
          >
            Miss<br />({misses})
          </Button>
        </div>

        {/* Hit type buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-12 text-xs font-semibold" onClick={() => addSwing("line_drive")}>
            Line Drive ({lineDrives})
          </Button>
          <Button variant="outline" className="h-12 text-xs font-semibold" onClick={() => addSwing("fly_ball")}>
            Fly Ball ({flyBalls})
          </Button>
          <Button variant="outline" className="h-12 text-xs font-semibold" onClick={() => addSwing("ground_ball")}>
            Ground Ball ({groundBalls})
          </Button>
        </div>

        {/* Undo */}
        {swings.length > 0 && (
          <Button variant="ghost" size="sm" onClick={undoLast} className="w-full text-xs text-muted-foreground">
            Undo Last Swing
          </Button>
        )}

        {/* End Session */}
        {swings.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Fatigue Level: {fatigue}
                </label>
                <Slider
                  value={[fatigue]}
                  onValueChange={([v]) => setFatigue(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Confidence After: {confidenceAfter}
                </label>
                <Slider
                  value={[confidenceAfter]}
                  onValueChange={([v]) => setConfidenceAfter(v)}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <Button
                className="w-full h-12 font-bold"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Complete Session"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
