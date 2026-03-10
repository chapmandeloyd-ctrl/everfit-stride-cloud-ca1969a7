import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import logoSrc from "@/assets/logo.png";

export default function ClientHoopsLab() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();

  const { data: sessions } = useQuery({
    queryKey: ["shooting-sessions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shooting_sessions")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const completedSessions = sessions?.filter((s) => s.status === "completed") || [];
  const totalShots = completedSessions.reduce((sum, s) => sum + (s.attempts || 0), 0);
  const totalMakes = completedSessions.reduce((sum, s) => sum + (s.makes || 0), 0);
  const avgAccuracy = totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/labs")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="KSOM" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-lg font-bold">KSOM Hoops Lab™</h1>
              <p className="text-xs text-muted-foreground">Shooting • Ball Handling • Court IQ</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/60">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black text-orange-400">{completedSessions.length}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Sessions</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black">{totalShots}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Shots</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black text-emerald-400">{avgAccuracy}%</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Start Session */}
        <Button
          className="w-full h-14 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => navigate("/client/labs/hoops/session")}
        >
          <Plus className="h-5 w-5 mr-2" />
          Start Shooting Session
        </Button>

        {/* Recent Sessions */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No sessions yet. Start your first one!</p>
            ) : (
              completedSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {format(new Date(session.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {session.drill_type.replace("-", " ")} • {session.attempts} shots
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {session.attempts > 0 ? Math.round((session.makes / session.attempts) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {session.makes}/{session.attempts} • 🔥 {session.best_streak}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
