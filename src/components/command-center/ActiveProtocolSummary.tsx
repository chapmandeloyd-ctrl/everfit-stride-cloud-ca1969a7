import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Flame, Utensils } from "lucide-react";

export function ActiveProtocolSummary({ clientId }: { clientId: string }) {
  const { data } = useQuery({
    queryKey: ["active-protocol-summary", clientId],
    queryFn: async () => {
      const [{ data: keto }, { data: settings }] = await Promise.all([
        supabase
          .from("client_keto_assignments")
          .select("keto_type:keto_types(name, code)")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("client_feature_settings")
          .select("selected_protocol_id, fasting_protocols:selected_protocol_id(name, fasting_hours, eating_hours)")
          .eq("client_id", clientId)
          .maybeSingle(),
      ]);
      return {
        ketoName: (keto as any)?.keto_type?.code || (keto as any)?.keto_type?.name || null,
        protocol: (settings as any)?.fasting_protocols || null,
      };
    },
  });

  if (!data?.ketoName && !data?.protocol) return null;

  const p = data.protocol;
  const fastLabel = p
    ? p.fasting_hours && p.eating_hours
      ? `${p.fasting_hours}:${p.eating_hours}`
      : p.name
    : null;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary">
          Active Protocol
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {data.ketoName && (
          <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm py-1 px-2.5">
            <Utensils className="h-3.5 w-3.5" />
            {data.ketoName}
          </Badge>
        )}
        {fastLabel && (
          <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm py-1 px-2.5">
            <Flame className="h-3.5 w-3.5" />
            {fastLabel}
            {p?.name && fastLabel !== p.name && (
              <span className="text-muted-foreground font-normal ml-1">· {p.name}</span>
            )}
          </Badge>
        )}
        {!data.ketoName && (
          <span className="text-xs text-muted-foreground">No keto type assigned</span>
        )}
        {!fastLabel && (
          <span className="text-xs text-muted-foreground">No fasting protocol assigned</span>
        )}
      </div>
    </div>
  );
}