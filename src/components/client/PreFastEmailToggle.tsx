import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { toast } from "@/hooks/use-toast";

type Pref = "all" | "final_only" | "off";

const OPTIONS: { value: Pref; label: string; hint: string }[] = [
  { value: "all", label: "All 3", hint: "Night before · 1h · 15min" },
  { value: "final_only", label: "Final", hint: "15 min before only" },
  { value: "off", label: "Off", hint: "No emails" },
];

/**
 * Compact pill toggle for pre-fast reminder emails.
 * Persists to client_feature_settings.pre_fast_email_pref.
 */
export function PreFastEmailToggle() {
  const clientId = useEffectiveClientId();
  const [pref, setPref] = useState<Pref | null>(null);
  const [saving, setSaving] = useState<Pref | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("pre_fast_email_pref" as any)
        .eq("client_id", clientId)
        .maybeSingle();
      if (cancelled) return;
      const v = (data as any)?.pre_fast_email_pref as Pref | null;
      setPref((v ?? "all") as Pref);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  async function update(next: Pref) {
    if (!clientId || next === pref) return;
    setSaving(next);
    const prev = pref;
    setPref(next);
    const { error } = await supabase
      .from("client_feature_settings")
      .update({ pre_fast_email_pref: next } as any)
      .eq("client_id", clientId);
    setSaving(null);
    if (error) {
      setPref(prev);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    }
  }

  if (pref === null) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pre-fast email reminders
        </p>
      </div>
      <div className="flex gap-1.5">
        {OPTIONS.map((opt) => {
          const active = pref === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => update(opt.value)}
              disabled={saving !== null}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all border ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/40 text-foreground border-border/60 hover:bg-muted/40"
              } disabled:opacity-60`}
            >
              <div>{opt.label}</div>
              <div className={`text-[9px] font-normal mt-0.5 ${active ? "opacity-90" : "text-muted-foreground"}`}>
                {opt.hint}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}