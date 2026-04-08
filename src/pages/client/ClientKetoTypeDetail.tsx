import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "sonner";

interface KetoType {
  id: string;
  abbreviation: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  difficulty: string;
  engine_compatibility: string;
  how_it_works: string | null;
  built_for: string[];
  coach_notes: string[];
  color: string;
  trainer_id: string;
  category_id: string;
}

export default function ClientKetoTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();

  const { data: ketoType } = useQuery({
    queryKey: ["keto-type", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as KetoType;
    },
    enabled: !!id,
  });

  const { data: allTypes } = useQuery({
    queryKey: ["keto-types-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("id, abbreviation, name, fat_pct, protein_pct, carbs_pct, color")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: activeAssignment } = useQuery({
    queryKey: ["client-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isActive = activeAssignment?.keto_type_id === id;

  const setActive = useMutation({
    mutationFn: async () => {
      if (!clientId || !ketoType) throw new Error("Missing data");
      // Deactivate current
      if (activeAssignment) {
        await supabase
          .from("client_keto_assignments")
          .update({ is_active: false })
          .eq("id", activeAssignment.id);
      }
      // Create new
      await supabase.from("client_keto_assignments").insert({
        client_id: clientId,
        keto_type_id: ketoType.id,
        assigned_by: clientId,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-keto-assignment"] });
      toast.success(`${ketoType?.abbreviation} — ${ketoType?.name} activated!`);
    },
  });

  if (!ketoType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const kt = ketoType;
  const maxPct = Math.max(kt.fat_pct, kt.protein_pct, kt.carbs_pct);

  const getDifficultyLabel = (d: string) => {
    if (d === "beginner") return "Beginner";
    if (d === "intermediate") return "Intermediate";
    if (d === "advanced") return "Advanced";
    return d;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Keto Types</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Hero card */}
        <Card
          className="overflow-hidden border"
          style={{ borderColor: `${kt.color}30`, backgroundColor: `${kt.color}06` }}
        >
          <CardContent className="p-5">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl font-black" style={{ color: kt.color }}>
                {kt.abbreviation}
              </span>
              <span className="text-lg text-muted-foreground">{kt.name}</span>
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {kt.subtitle || kt.name}
            </h2>
            {kt.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{kt.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Difficulty</p>
              <p className="font-bold mt-1">{getDifficultyLabel(kt.difficulty)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Engine</p>
              <p className="font-bold mt-1 capitalize">{kt.engine_compatibility}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Carb Limit</p>
              <p className="font-bold mt-1">{kt.carbs_pct}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Macro breakdown */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Macro Breakdown</h3>
            {[
              { label: "Fat", pct: kt.fat_pct, color: "#4ade80" },
              { label: "Protein", pct: kt.protein_pct, color: "#94a3b8" },
              { label: "Carbs", pct: kt.carbs_pct, color: "#475569" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-3 mb-3">
                <span className="text-sm w-14">{m.label}</span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(m.pct / maxPct) * 100}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
                <span className="text-sm font-bold w-10 text-right" style={{ color: kt.color }}>
                  {m.pct}%
                </span>
              </div>
            ))}
            {kt.carb_limit_grams && (
              <>
                <p className="text-xs text-muted-foreground italic mt-1">
                  Fat &amp; protein tracked loosely — carbs only ≤{kt.carb_limit_grams}g/day
                </p>
                <p className="text-sm mt-2">
                  Carb limit: <strong>≤{kt.carb_limit_grams}g net carbs per day (carbs only tracked)</strong>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        {kt.how_it_works && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3">How It Works</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{kt.how_it_works}</p>
            </CardContent>
          </Card>
        )}

        {/* Built for */}
        {kt.built_for && kt.built_for.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Built For</h3>
              <ul className="space-y-2.5">
                {kt.built_for.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Coach notes */}
        {kt.coach_notes && kt.coach_notes.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Coach Notes</h3>
              <ul className="space-y-3">
                {kt.coach_notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Macro comparison chart */}
        {allTypes && allTypes.length > 1 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4">
                Macro Comparison — All Types
              </h3>
              <div className="space-y-3">
                {allTypes.map((t) => {
                  const total = t.fat_pct + t.protein_pct + t.carbs_pct;
                  const fatW = (t.fat_pct / total) * 100;
                  const protW = (t.protein_pct / total) * 100;
                  const carbW = (t.carbs_pct / total) * 100;
                  const isCurrent = t.id === kt.id;

                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <span
                        className="text-xs font-bold w-12"
                        style={{ color: t.color }}
                      >
                        {t.abbreviation}
                      </span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                        <div
                          className="h-full"
                          style={{ width: `${fatW}%`, backgroundColor: t.color, opacity: 0.8 }}
                        />
                        <div
                          className="h-full bg-muted-foreground/30"
                          style={{ width: `${protW}%` }}
                        />
                        <div
                          className="h-full bg-muted-foreground/60"
                          style={{ width: `${carbW}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-28 text-right">
                        <span style={{ color: t.color }}>{t.fat_pct}%F</span>{" "}
                        {t.protein_pct}%P {t.carbs_pct}%C
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-primary/60" />
                  <span className="text-xs text-muted-foreground">Fat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">Protein</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground">Carbs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-20">
        {isActive ? (
          <Button className="w-full h-14 text-base font-bold" disabled>
            Currently Active
          </Button>
        ) : (
          <Button
            className="w-full h-14 text-base font-bold text-white"
            style={{ backgroundColor: kt.color }}
            onClick={() => setActive.mutate()}
            disabled={setActive.isPending}
          >
            Set {kt.abbreviation} — {kt.name}
          </Button>
        )}
        <p className="text-xs text-center text-muted-foreground mt-2">
          This information is educational only and not a substitute for medical advice.
        </p>
      </div>
    </div>
  );
}
