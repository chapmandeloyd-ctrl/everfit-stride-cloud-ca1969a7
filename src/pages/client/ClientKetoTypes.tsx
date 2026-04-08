import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Zap, Flame, Shield, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientLayout } from "@/components/ClientLayout";

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
  description: string | null;
  fat_pct: number;
  protein_pct: number;
  carbs_pct: number;
  carb_limit_grams: number | null;
  difficulty: string;
  color: string;
  category_id: string;
  order_index: number;
}

const CATEGORY_STYLES: Record<string, { icon: any; tailwindColor: string; tailwindBg: string; borderColor: string }> = {
  default: { icon: Zap, tailwindColor: "text-blue-500", tailwindBg: "bg-blue-500/10", borderColor: "border-l-blue-500" },
};

function getCategoryStyle(color: string) {
  // Map hex colors to tailwind classes
  const colorMap: Record<string, { tailwindColor: string; tailwindBg: string; borderColor: string }> = {
    "#ef4444": { tailwindColor: "text-red-500", tailwindBg: "bg-red-500/10", borderColor: "border-l-red-500" },
    "#3b82f6": { tailwindColor: "text-blue-500", tailwindBg: "bg-blue-500/10", borderColor: "border-l-blue-500" },
    "#6366f1": { tailwindColor: "text-indigo-500", tailwindBg: "bg-indigo-500/10", borderColor: "border-l-indigo-500" },
    "#8b5cf6": { tailwindColor: "text-violet-500", tailwindBg: "bg-violet-500/10", borderColor: "border-l-violet-500" },
    "#ec4899": { tailwindColor: "text-pink-500", tailwindBg: "bg-pink-500/10", borderColor: "border-l-pink-500" },
    "#f97316": { tailwindColor: "text-orange-500", tailwindBg: "bg-orange-500/10", borderColor: "border-l-orange-500" },
    "#eab308": { tailwindColor: "text-yellow-500", tailwindBg: "bg-yellow-500/10", borderColor: "border-l-yellow-500" },
    "#22c55e": { tailwindColor: "text-green-500", tailwindBg: "bg-green-500/10", borderColor: "border-l-green-500" },
    "#14b8a6": { tailwindColor: "text-teal-500", tailwindBg: "bg-teal-500/10", borderColor: "border-l-teal-500" },
    "#06b6d4": { tailwindColor: "text-cyan-500", tailwindBg: "bg-cyan-500/10", borderColor: "border-l-cyan-500" },
    "#64748b": { tailwindColor: "text-slate-500", tailwindBg: "bg-slate-500/10", borderColor: "border-l-slate-500" },
  };
  return colorMap[color] || { tailwindColor: "text-blue-500", tailwindBg: "bg-blue-500/10", borderColor: "border-l-blue-500" };
}

export default function ClientKetoTypes() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();

  const { data: categories, isLoading } = useQuery({
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

  const grouped = categories?.map((cat) => ({
    category: cat,
    style: getCategoryStyle(cat.color),
    items: ketoTypes?.filter((t) => t.category_id === cat.id) || [],
  })).filter((g) => g.items.length > 0) || [];

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Keto Types</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : grouped.length > 0 ? (
          grouped.map((group) => (
            <div key={group.category.id} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <Zap className={`h-5 w-5 ${group.style.tailwindColor}`} />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${group.style.tailwindColor}`}>
                  {group.category.name}
                </h2>
              </div>

              {/* Keto type cards */}
              {group.items.map((kt) => {
                const isActive = kt.id === activeKetoTypeId;

                return (
                  <Card
                    key={kt.id}
                    className={`cursor-pointer border-l-4 ${group.style.borderColor} transition-colors hover:bg-muted/30 relative overflow-hidden`}
                    onClick={() => navigate(`/client/keto-types/${kt.id}`)}
                  >
                    <CardContent className="p-4 space-y-2">
                      {/* Top row with icon + title */}
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl ${group.style.tailwindBg} flex items-center justify-center shrink-0`}>
                          <span className="text-lg font-black" style={{ color: kt.color }}>
                            {kt.abbreviation.slice(0, 3)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base truncate">{kt.name}</h3>
                            {isActive && (
                              <Badge className="text-[10px] px-2 py-0 h-5 bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15">
                                ACTIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {kt.subtitle || `${kt.fat_pct}%F · ${kt.protein_pct}%P · ${kt.carbs_pct}%C`}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>

                      {/* Details row */}
                      <div className="flex items-center gap-3 pl-[60px]">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            <span className="font-semibold text-foreground">{kt.fat_pct}%</span> Fat
                          </span>
                          <span>
                            <span className="font-semibold text-foreground">{kt.protein_pct}%</span> Protein
                          </span>
                          <span>
                            <span className="font-semibold text-foreground">{kt.carbs_pct}%</span> Carbs
                          </span>
                          <span className="capitalize">
                            {getDifficultyLabel(kt.difficulty)}
                          </span>
                        </div>
                      </div>

                      {/* Description preview */}
                      {kt.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed pl-[60px] line-clamp-2">
                          {kt.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No keto types available yet</p>
            <p className="text-sm mt-1">Your coach will set these up for you.</p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}