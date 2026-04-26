import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { X, Lock } from "lucide-react";
import lionLogo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

/**
 * Editorial Black & Gold preview of the entire KSOM fasting library.
 * Pulls real quick plans + programs from the database, grouped by intensity tier.
 * Locked to the "Lion" card variant per user direction.
 */

const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const BLACK = "hsl(0 0% 4%)";
const CARD_BG = "hsl(0 0% 7%)";

type QuickPlan = {
  id: string;
  name: string;
  fast_hours: number;
  intensity_tier: string | null;
  description: string | null;
};

type Protocol = {
  id: string;
  name: string;
  description: string | null;
  duration_days: number | null;
  intensity_tier: string | null;
  fast_target_hours: number | null;
};

const TIER_ORDER = ["low", "medium", "high", "extreme"] as const;
const TIER_LABEL: Record<string, string> = {
  low: "Beginner Windows",
  medium: "Intermediate Windows",
  high: "Advanced Windows",
  extreme: "Extended Fasts",
};

function LionCard({
  eyebrow,
  name,
  desc,
  onClick,
  locked = false,
}: {
  eyebrow: string;
  name: string;
  desc: unknown;
  onClick?: () => void;
  locked?: boolean;
}) {
  // description may be a string OR a JSON object (e.g. { subtitle, focus, ... })
  let descText: string | null = null;
  if (typeof desc === "string") {
    descText = desc;
  } else if (desc && typeof desc === "object") {
    const d = desc as Record<string, unknown>;
    descText =
      (typeof d.subtitle === "string" && d.subtitle) ||
      (typeof d.focus === "string" && d.focus) ||
      (typeof d.who_for === "string" && d.who_for) ||
      null;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full text-left overflow-hidden p-5 transition active:scale-[0.99]"
      style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}
    >
      <img
        src={lionLogo}
        alt=""
        aria-hidden
        className="absolute -right-10 top-1/2 -translate-y-1/2 w-44 h-44 object-contain pointer-events-none"
        style={{
          filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
          opacity: locked ? 0.08 : 0.18,
        }}
      />
      {locked && (
        <div
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold"
          style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}50` }}
        >
          <Lock className="h-2.5 w-2.5" />
          Locked
        </div>
      )}
      <div className="relative space-y-2.5 max-w-[62%]">
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
          {eyebrow}
        </p>
        <h3
          className="text-2xl font-light tracking-tight leading-tight"
          style={{ color: locked ? MUTED : IVORY, fontFamily: "Georgia, serif" }}
        >
          {name}
        </h3>
        {descText && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: MUTED }}>
            {descText}
          </p>
        )}
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

export default function ClientFastingPlansPreview() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const [tab, setTab] = useState<"windows" | "programs">("windows");

  // Pull the client's current assignment + lock state so we can mark every
  // card the admin has NOT assigned as locked.
  const { data: featureSettings } = useQuery({
    queryKey: ["preview-feature-settings", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id, lock_client_plan_choice")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const isLocked = !!featureSettings?.lock_client_plan_choice;
  const assignedQuickId = featureSettings?.selected_quick_plan_id ?? null;
  const assignedProtocolId = featureSettings?.selected_protocol_id ?? null;

  const { data: quickPlans = [], isLoading: loadingQ } = useQuery({
    queryKey: ["preview-quick-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("id, name, fast_hours, intensity_tier, description")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as QuickPlan[];
    },
  });

  const { data: protocols = [], isLoading: loadingP } = useQuery({
    queryKey: ["preview-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("id, name, description, duration_days, intensity_tier, fast_target_hours")
        .order("duration_days", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Protocol[];
    },
  });

  const grouped = TIER_ORDER.reduce<Record<string, QuickPlan[]>>((acc, t) => {
    acc[t] = quickPlans.filter((p) => (p.intensity_tier ?? "low") === t);
    return acc;
  }, {});

  const recommended = quickPlans.find((p) => p.fast_hours === 16) ?? quickPlans[0];

  return (
    <div className="min-h-screen" style={{ background: BLACK }}>
      <div
        className="sticky top-0 z-10 flex items-center gap-2 p-3"
        style={{ background: BLACK, borderBottom: `1px solid ${GOLD}20` }}
      >
        <button onClick={() => navigate(-1)} className="p-2" style={{ color: IVORY }}>
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 flex gap-2 justify-end">
          <button
            onClick={() => setTab("windows")}
            className="px-3 py-1.5 text-[11px] uppercase tracking-widest"
            style={{
              background: tab === "windows" ? GOLD : "transparent",
              color: tab === "windows" ? BLACK : GOLD,
              border: `1px solid ${GOLD}`,
            }}
          >
            Windows
          </button>
          <button
            onClick={() => setTab("programs")}
            className="px-3 py-1.5 text-[11px] uppercase tracking-widest"
            style={{
              background: tab === "programs" ? GOLD : "transparent",
              color: tab === "programs" ? BLACK : GOLD,
              border: `1px solid ${GOLD}`,
            }}
          >
            Programs
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-12 space-y-8">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
            The Protocol
          </p>
          <h1
            className="text-4xl font-light tracking-tight"
            style={{ color: IVORY, fontFamily: "Georgia, serif" }}
          >
            Fasting plans
          </h1>
          <p className="text-xs" style={{ color: MUTED }}>
            {tab === "windows"
              ? `${quickPlans.length} fasting windows · curated by intensity`
              : `${protocols.length} structured programs · multi-day protocols`}
          </p>
        </div>

        {tab === "windows" && (
          <>
            {loadingQ && <p style={{ color: MUTED }} className="text-xs">Loading…</p>}

            {recommended && (
              <section className="space-y-3">
                <SectionLabel>Recommended for you</SectionLabel>
                <LionCard
                  eyebrow={`${recommended.fast_hours}hr fasting`}
                  name={recommended.name}
                  desc={recommended.description ?? "Balanced window for most lifestyles."}
                  locked={isLocked && assignedQuickId !== recommended.id}
                  onClick={() =>
                    navigate(
                      `/client/fasting-plan-detail-preview?type=quick&id=${recommended.id}`,
                    )
                  }
                />
              </section>
            )}

            {TIER_ORDER.map((tier) => {
              const items = grouped[tier];
              if (!items || items.length === 0) return null;
              return (
                <section key={tier} className="space-y-3">
                  <SectionLabel>{TIER_LABEL[tier]}</SectionLabel>
                  <div className="space-y-3">
                    {items.map((p) => (
                      <LionCard
                        key={p.id}
                        eyebrow={`${p.fast_hours}hr fasting`}
                        name={p.name}
                        desc={p.description}
                        locked={isLocked && assignedQuickId !== p.id}
                        onClick={() =>
                          navigate(
                            `/client/fasting-plan-detail-preview?type=quick&id=${p.id}`,
                          )
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}

        {tab === "programs" && (
          <section className="space-y-3">
            {loadingP && <p style={{ color: MUTED }} className="text-xs">Loading…</p>}
            <SectionLabel>All Programs</SectionLabel>
            <div className="space-y-3">
              {protocols.map((p) => {
                const eyebrow =
                  p.duration_days && p.duration_days > 0
                    ? `${p.duration_days}-day program`
                    : p.fast_target_hours
                    ? `${p.fast_target_hours}hr target`
                    : "Ongoing protocol";
                return (
                  <LionCard
                    key={p.id}
                    eyebrow={eyebrow}
                    name={p.name}
                    desc={p.description}
                    locked={isLocked && assignedProtocolId !== p.id}
                    onClick={() =>
                      navigate(
                        `/client/fasting-plan-detail-preview?type=program&id=${p.id}`,
                      )
                    }
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}