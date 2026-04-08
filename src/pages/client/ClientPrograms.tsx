import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  getDifficultyLabel,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";
import {
  LEVEL_TIERS,
  getTierForLevel,
  getIntensityLabel,
} from "@/lib/quickPlanTierConfig";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
}

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  description: any;
  min_level_required: number;
  intensity_tier: string | null;
  plan_type: string | null;
  is_extended_fast: boolean;
}

export default function ClientPrograms() {
  const navigate = useNavigate();

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
    },
  });

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    config: CATEGORY_CONFIG[cat],
    items: protocols?.filter((p) => p.category === cat) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/choose-protocol")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">All Programs</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => {
            const Icon = group.config.icon;
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${group.config.color}`} />
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${group.config.color}`}>
                    {group.config.label}
                  </h2>
                </div>
                {group.items.map((protocol) => {
                  const CatIcon = group.config.icon;
                  return (
                    <div
                      key={protocol.id}
                      className="group relative cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1 active:scale-[0.985]"
                      onClick={() => navigate(`/client/protocol/${protocol.id}`)}
                    >
                      <div className={`absolute inset-0 rounded-[28px] ${group.config.cardShadowClass}`} />
                      <div className={`absolute -inset-[1px] rounded-[28px] bg-gradient-to-br ${group.config.glowGradient} opacity-90`} />
                      <div className={`absolute inset-[1px] rounded-[27px] ${group.config.cardSurfaceClass}`} />
                      <div className={`absolute -right-6 top-4 h-24 w-24 rounded-full ${group.config.bgColor} blur-3xl opacity-90`} />
                      <div className="absolute inset-x-6 top-0 h-px bg-white/90" />

                      <div className={`relative rounded-[27px] border ${group.config.cardBorderClass} backdrop-blur-xl overflow-hidden`}>
                        <div className="px-6 pt-6 pb-3">
                          <div className="mb-4 flex items-center gap-3">
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${group.config.bgColor} ring-1 ring-white/70 shadow-lg`}>
                              <CatIcon className={`h-7 w-7 ${group.config.color}`} />
                            </div>
                            <span className={`text-sm font-black uppercase tracking-[0.18em] ${group.config.color}`}>
                              {group.config.label}
                            </span>
                          </div>

                          <h3 className="text-[2.15rem] font-black tracking-[-0.04em] leading-[0.95] text-foreground drop-shadow-sm">
                            {protocol.name}
                          </h3>

                          {protocol.description && (
                            <p className="mt-3 max-w-[28ch] text-base leading-relaxed text-muted-foreground line-clamp-2">
                              {protocol.description}
                            </p>
                          )}
                        </div>

                        <div className="mx-6 border-t border-border/70" />

                        <div className="flex items-end gap-5 px-6 py-4">
                          <div className="shrink-0">
                            <span className={`block text-lg font-black leading-none ${group.config.color}`}>
                              {protocol.fast_target_hours}h
                            </span>
                            <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Fast</span>
                          </div>

                          <div className="shrink-0">
                            <span className="block text-lg font-black leading-none text-foreground">
                              {getDurationLabel(protocol.duration_days)}
                            </span>
                            <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Duration</span>
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            <div className="text-right">
                              <span className="block text-lg font-black leading-none text-foreground">
                                {getDifficultyLabel(protocol.difficulty_level)}
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Level</span>
                            </div>
                            <ChevronRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${group.config.color}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </ClientLayout>
  );
}
