import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  getDifficultyLabel,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
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
                      className="relative cursor-pointer overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => navigate(`/client/protocol/${protocol.id}`)}
                    >
                      {/* Glow border */}
                      <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-br ${group.config.glowGradient || 'from-emerald-400/40 via-transparent to-emerald-600/40'} blur-[2px]`} />
                      
                      {/* Glass card */}
                      <div className="relative rounded-xl border border-white/10 bg-card/80 backdrop-blur-xl">
                        <div className="px-5 pt-4 pb-2">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-10 w-10 rounded-full ${group.config.bgColor} flex items-center justify-center`}>
                                <CatIcon className={`h-5 w-5 ${group.config.color}`} />
                              </div>
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${group.config.color}`}>
                                {group.config.label}
                              </span>
                            </div>
                          </div>
                          <h3 className="text-2xl font-black tracking-tight leading-none mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">{protocol.name}</h3>
                          {protocol.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{protocol.description}</p>
                          )}
                        </div>
                        <div className="mx-5 border-t border-white/10" />
                        <div className="px-5 py-3 flex items-center gap-5">
                          <div>
                            <span className="text-lg font-bold text-primary drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]">{protocol.fast_target_hours}h</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Fast</span>
                          </div>
                          <div>
                            <span className="text-lg font-bold">{getDurationLabel(protocol.duration_days)}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Duration</span>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <div>
                              <span className="text-lg font-bold">{getDifficultyLabel(protocol.difficulty_level)}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Level</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
