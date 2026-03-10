import { Card, CardContent } from "@/components/ui/card";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SportModeEngine } from "./SportModeEngine";
import { SportLabCard } from "./SportLabCard";

export function SportCommandCenter() {
  const clientId = useEffectiveClientId();

  const { data: sportProfiles } = useQuery({
    queryKey: ["client-sport-profiles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_profiles")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const primarySport = sportProfiles?.[0];
  const sport = primarySport?.sport || "softball";
  const seasonStatus = primarySport?.season_status || "off-season";

  const hasSoftball = sportProfiles?.some((p) => p.sport === "softball" || p.sport === "baseball");
  const hasBasketball = sportProfiles?.some((p) => p.sport === "basketball");

  return (
    <div className="space-y-4">
      {/* System Header */}
      <Card className="border-border/60 bg-card/80">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            KSOM Sport Performance System™
          </p>
          <p className="text-xs text-muted-foreground mt-1 italic">
            Built for growth. Tuned for competition.
          </p>
        </CardContent>
      </Card>

      {/* Sport Mode Engine Ring */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <SportModeEngine sport={sport} seasonStatus={seasonStatus} />
        </CardContent>
      </Card>

      {/* Lab Cards */}
      {hasSoftball && (
        <SportLabCard
          title="KSOM Diamond Lab™"
          subtitle="Batting • Throwing • Field Work"
          accentColor="hsl(45, 90%, 50%)"
          labRoute="/client/labs/diamond"
        />
      )}

      {hasBasketball && (
        <SportLabCard
          title="KSOM Hoops Lab™"
          subtitle="Shooting • Ball Handling • Court IQ"
          accentColor="hsl(25, 90%, 55%)"
          labRoute="/client/labs/hoops"
        />
      )}

      {/* Fallback if no sport profiles */}
      {!hasSoftball && !hasBasketball && (
        <>
          <SportLabCard
            title="KSOM Diamond Lab™"
            subtitle="Batting • Throwing • Field Work"
            accentColor="hsl(45, 90%, 50%)"
            labRoute="/client/labs/diamond"
          />
          <SportLabCard
            title="KSOM Hoops Lab™"
            subtitle="Shooting • Ball Handling • Court IQ"
            accentColor="hsl(25, 90%, 55%)"
            labRoute="/client/labs/hoops"
          />
        </>
      )}
    </div>
  );
}
