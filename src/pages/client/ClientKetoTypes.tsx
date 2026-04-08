import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

interface KetoCategory {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  order_index: number;
}

interface KetoType {
  id: string;
  abbreviation: string;
  name: string;
  subtitle: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  difficulty: string;
  color: string;
  category_id: string;
  order_index: number;
}

export default function ClientKetoTypes() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();

  const { data: categories } = useQuery({
    queryKey: ["keto-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_categories")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as KetoCategory[];
    },
  });

  const { data: ketoTypes } = useQuery({
    queryKey: ["keto-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keto_types")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as KetoType[];
    },
  });

  const { data: activeAssignment } = useQuery({
    queryKey: ["client-keto-assignment", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_keto_assignments")
        .select("*, keto_types(*)")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const activeKetoTypeId = activeAssignment?.keto_type_id;

  const getDifficultyLabel = (d: string) => {
    if (d === "beginner") return "Beginner";
    if (d === "intermediate") return "Intermediate";
    if (d === "advanced") return "Advanced";
    return d;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Keto Types</h1>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {categories?.map((cat) => {
          const typesInCat = ketoTypes?.filter((t) => t.category_id === cat.id) || [];
          if (typesInCat.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <Zap className="h-4 w-4" style={{ color: cat.color }} />
                </div>
                <span className="text-base font-semibold" style={{ color: cat.color }}>
                  {cat.name}
                </span>
              </div>

              {/* Keto type cards */}
              {typesInCat.map((kt) => {
                const isActive = kt.id === activeKetoTypeId;

                return (
                  <Card
                    key={kt.id}
                    className="cursor-pointer transition-all border overflow-hidden"
                    style={{
                      borderColor: isActive ? `${kt.color}60` : undefined,
                      backgroundColor: isActive ? `${kt.color}08` : undefined,
                    }}
                    onClick={() => navigate(`/client/keto-types/${kt.id}`)}
                  >
                    <CardContent className="p-5">
                      {/* Top row: label + active badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${kt.color}20` }}
                          >
                            <Zap className="h-3 w-3" style={{ color: kt.color }} />
                          </div>
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: kt.color }}
                          >
                            Keto Type
                          </span>
                        </div>
                        {isActive && (
                          <span
                            className="text-xs font-bold px-3 py-1 rounded-full"
                            style={{
                              color: kt.color,
                              backgroundColor: `${kt.color}15`,
                              border: `1px solid ${kt.color}30`,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Big abbreviation */}
                      <h2
                        className="text-5xl font-black tracking-tight mb-2"
                        style={{ color: kt.color }}
                      >
                        {kt.abbreviation}
                      </h2>

                      {/* Name + subtitle */}
                      <h3 className="text-base font-semibold">{kt.name}</h3>
                      {kt.subtitle && (
                        <p className="text-sm text-muted-foreground mt-0.5">{kt.subtitle}</p>
                      )}

                      {/* Divider */}
                      <div className="border-t my-3" />

                      {/* Stats row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <span
                              className="text-base font-bold"
                              style={{ color: kt.color }}
                            >
                              {kt.fat_pct}%
                            </span>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fat</p>
                          </div>
                          <div>
                            <span className="text-base font-bold">{kt.protein_pct}%</span>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Protein</p>
                          </div>
                          <div>
                            <span className="text-base font-bold">{kt.carbs_pct}%</span>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Carbs</p>
                          </div>
                          <div>
                            <span className="text-base font-bold">
                              {getDifficultyLabel(kt.difficulty)}
                            </span>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Level</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}

        {(!categories || categories.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No keto types available yet</p>
            <p className="text-sm mt-1">Your coach will set these up for you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
