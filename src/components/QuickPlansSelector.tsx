import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Clock, Hourglass, UtensilsCrossed } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QuickPlan {
  id: string;
  name: string;
  fast_hours: number;
  eat_hours: number;
  difficulty_group: string;
  order_index: number;
  description: any;
}

const FEATURED_PLANS = ["16:8", "18:6", "20:4"];

export function QuickPlansSelector({ navigate }: { navigate: (path: string) => void }) {
  const { data: plans } = useQuery({
    queryKey: ["quick-plans-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .in("name", FEATURED_PLANS);
      if (error) throw error;
      return data as QuickPlan[];
    },
  });

  const sorted = FEATURED_PLANS.map((n) => plans?.find((p) => p.name === n)).filter(Boolean) as QuickPlan[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Quick Plans</h2>
        </div>
        <button
          className="text-sm font-semibold text-primary flex items-center gap-1"
          onClick={() => navigate("/client/quick-plans")}
        >
          View All <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {sorted.map((plan) => (
        <Card
          key={plan.id}
          className="cursor-pointer overflow-hidden transition-all hover:shadow-md active:scale-[0.99]"
          onClick={() => navigate(`/client/quick-plan/${plan.id}`)}
        >
          <CardContent className="p-0">
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Quick Plan
                </span>
              </div>
              <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{plan.name}</h3>
              {plan.description?.subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{plan.description.subtitle}</p>
              )}
            </div>
            <div className="mx-5 border-t" />
            <div className="px-5 py-3 flex items-center gap-5">
              <div>
                <div className="flex items-center gap-1">
                  <Hourglass className="h-3.5 w-3.5 text-primary" />
                  <span className="text-lg font-bold text-primary">{plan.fast_hours}h</span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Fast</span>
              </div>
              {plan.eat_hours > 0 && (
                <div>
                  <div className="flex items-center gap-1">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-lg font-bold">{plan.eat_hours}h</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Eat</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
