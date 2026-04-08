import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarDays, ChevronRight, Clock, UtensilsCrossed, Zap, TrendingUp, Lightbulb, BarChart3, Users, Droplets, Utensils } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  getDifficultyLabel,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";
import { PROTOCOL_DETAIL_COPY } from "@/lib/protocolDetailContent";
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
  difficulty_group: string;
  order_index: number;
  description: any;
}




function generateWeeklyProgression(durationDays: number, fastTargetHours: number) {
  const weeks = Math.ceil(durationDays / 7);
  if (weeks <= 1 || durationDays === 0) return null;
  const startHours = Math.max(12, fastTargetHours - (weeks - 1));
  const progression = [];
  for (let w = 1; w <= weeks; w++) {
    const fh = Math.min(startHours + (w - 1), fastTargetHours);
    progression.push({ week: w, fastHours: fh, eatHours: 24 - fh });
  }
  return progression;
}

export function KetoProtocolsTab() {
  const [viewingProtocol, setViewingProtocol] = useState<FastingProtocol | null>(null);
  const [viewingQuickPlan, setViewingQuickPlan] = useState<QuickPlan | null>(null);

  const { data: protocols, isLoading: protocolsLoading } = useQuery({
    queryKey: ["admin-fasting-protocols"],
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

  const { data: quickPlans, isLoading: plansLoading } = useQuery({
    queryKey: ["admin-quick-fasting-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as QuickPlan[];
    },
  });

  const groupedProtocols = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    config: CATEGORY_CONFIG[cat],
    items: protocols?.filter((p) => p.category === cat) || [],
  })).filter((g) => g.items.length > 0);

  // Group quick plans by level tier
  const quickPlansByTier = LEVEL_TIERS.map((tier) => ({
    tier,
    items: (quickPlans || []).filter((p: any) => tier.levels.includes(p.min_level_required ?? 1)),
  })).filter((g) => g.items.length > 0);

  const isLoading = protocolsLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* ── Programs (Glassmorphism Style 1) ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Programs</h2>
            <Badge variant="secondary" className="text-xs">{protocols?.length || 0}</Badge>
          </div>

          {groupedProtocols.map((group) => {
            const Icon = group.config.icon;
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2 mt-4">
                  <Icon className={`h-4 w-4 ${group.config.color}`} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${group.config.color}`}>
                    {group.config.label}
                  </h3>
                </div>
                {group.items.map((protocol) => {
                  const CatIcon = group.config.icon;
                  return (
                    <div
                      key={protocol.id}
                      className="group relative cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1 active:scale-[0.985]"
                      onClick={() => setViewingProtocol(protocol)}
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
          })}
        </div>

        {/* ── Quick Plans (Aurora Gradient Style) ── */}
        {quickPlansByTier.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Quick Plans</h2>
              <Badge variant="secondary" className="text-xs">{quickPlans?.length || 0}</Badge>
            </div>

            {quickPlansByTier.map(({ tier, items }) => {
              const TierIcon = tier.icon;
              return (
                <div key={tier.label} className="space-y-3">
                  <div className="flex items-center gap-2 mt-2">
                    <TierIcon className={`h-4 w-4 ${tier.accentColor}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${tier.accentColor}`}>
                      {tier.label} — {tier.subtitle}
                    </h3>
                    <span className={`ml-auto text-[10px] font-semibold uppercase tracking-widest ${tier.accentColor} ${tier.badgeBg} px-2 py-0.5 rounded-full`}>
                      {tier.levels.length === 1 ? `Lvl ${tier.levels[0]}` : `Lvl ${tier.levels[0]}–${tier.levels[tier.levels.length - 1]}`}
                    </span>
                  </div>

                  {items.map((plan: any) => {
                    const planTier = getTierForLevel(plan.min_level_required ?? 1);
                    const PlanIcon = planTier.icon;
                    const subtitle = typeof plan.description === "object" && plan.description?.subtitle
                      ? plan.description.subtitle
                      : null;

                    return (
                      <div
                        key={plan.id}
                        className="group relative cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1 active:scale-[0.985]"
                        onClick={() => setViewingQuickPlan(plan)}
                      >
                        <div className={`absolute inset-0 rounded-[28px] ${planTier.glowShadow}`} />
                        <div className={`absolute -inset-[1px] rounded-[28px] bg-gradient-to-br ${planTier.cardGradient} opacity-80`} />
                        <div className="absolute inset-[1px] rounded-[27px] bg-gradient-to-br from-background/95 via-background/90 to-background/85 backdrop-blur-xl" />
                        <div className={`absolute -right-8 -top-4 h-28 w-28 rounded-full bg-gradient-to-br ${planTier.cardGradient} blur-3xl opacity-60`} />
                        <div className="absolute inset-x-8 top-0 h-px bg-white/60" />

                        <div className={`relative rounded-[27px] border ${planTier.borderClass} backdrop-blur-xl overflow-hidden`}>
                          <div className="px-6 pt-6 pb-3">
                            <div className="mb-4 flex items-center gap-3">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${planTier.badgeBg} ring-1 ring-white/40 shadow-lg`}>
                                <PlanIcon className={`h-6 w-6 ${planTier.accentColor}`} />
                              </div>
                              <div>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${planTier.accentColor}`}>
                                  Level {plan.min_level_required ?? 1}
                                </span>
                              </div>
                              <div className="ml-auto">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planTier.badgeBg} ${planTier.accentColor}`}>
                                  {getIntensityLabel(plan.intensity_tier)}
                                </span>
                              </div>
                            </div>

                            <h3 className="text-[2rem] font-black tracking-[-0.04em] leading-[0.95] text-foreground drop-shadow-sm">
                              {plan.name}
                            </h3>

                            {subtitle && (
                              <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-muted-foreground line-clamp-2">
                                {subtitle}
                              </p>
                            )}
                          </div>

                          <div className="mx-6 border-t border-border/60" />

                          <div className="flex items-end gap-5 px-6 py-4">
                            <div className="shrink-0">
                              <span className={`block text-lg font-black leading-none ${planTier.accentColor}`}>
                                {plan.fast_hours}h
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Fast</span>
                            </div>
                            <div className="shrink-0">
                              <span className="block text-lg font-black leading-none text-foreground">
                                {plan.eat_hours}h
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Eat</span>
                            </div>
                            <div className="ml-auto flex items-center gap-1">
                              <ChevronRight className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1 ${planTier.accentColor}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Protocol Detail Sheet */}
      <Sheet open={!!viewingProtocol} onOpenChange={(open) => !open && setViewingProtocol(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="sr-only">{viewingProtocol?.name}</SheetTitle>
          </SheetHeader>
          {viewingProtocol && <ProtocolDetailContent protocol={viewingProtocol} />}
        </SheetContent>
      </Sheet>

      {/* Quick Plan Detail Sheet */}
      <Sheet open={!!viewingQuickPlan} onOpenChange={(open) => !open && setViewingQuickPlan(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="sr-only">{viewingQuickPlan?.name}</SheetTitle>
          </SheetHeader>
          {viewingQuickPlan && <QuickPlanDetailContent plan={viewingQuickPlan} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ── Protocol Detail (inside Sheet) ── */
function ProtocolDetailContent({ protocol }: { protocol: FastingProtocol }) {
  const config = CATEGORY_CONFIG[protocol.category];
  const Icon = config?.icon || CalendarDays;
  const customCopy = PROTOCOL_DETAIL_COPY[protocol.id];
  const autoProgression = generateWeeklyProgression(protocol.duration_days, protocol.fast_target_hours);
  const eatHours = 24 - protocol.fast_target_hours;

  return (
    <div className="px-4 pb-8 space-y-6">
      {/* Hero */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {config && (
            <div className={`h-14 w-14 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
              <Icon className={`h-7 w-7 ${config.color}`} />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black leading-tight">{protocol.name}</h2>
            <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${config?.color || "text-muted-foreground"}`}>
              {protocol.category}
            </p>
          </div>
        </div>
        {(customCopy?.descriptionOverride || protocol.description) && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {customCopy?.descriptionOverride || protocol.description}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
          <Clock className="h-5 w-5 mx-auto text-blue-400" />
          <p className="text-xl font-bold">{customCopy?.statsLabel || `${protocol.fast_target_hours}h`}</p>
          <p className="text-[11px] text-muted-foreground">Fasting Window</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
          <CalendarDays className="h-5 w-5 mx-auto text-blue-400" />
          <p className="text-xl font-bold">{protocol.duration_days === 0 ? "∞" : protocol.duration_days}</p>
          <p className="text-[11px] text-muted-foreground">{protocol.duration_days === 0 ? "Ongoing" : "Days"}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
          <BarChart3 className="h-5 w-5 mx-auto text-blue-400" />
          <p className="text-xl font-bold capitalize">{customCopy?.difficultyLabel || getDifficultyLabel(protocol.difficulty_level)}</p>
          <p className="text-[11px] text-muted-foreground">Difficulty</p>
        </div>
      </div>

      {/* How It Works */}
      <Section title="How This Protocol Works" icon={<Lightbulb className="h-5 w-5 text-blue-400" />}>
        {customCopy ? (
          <div className="space-y-3">
            {customCopy.howItWorks.map((p: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {protocol.name} is a {protocol.duration_days === 0 ? "flexible ongoing" : `${protocol.duration_days}-day`} fasting
            program designed to help your body transition from sugar-burning to fat-burning safely and sustainably.
          </p>
        )}
      </Section>

      {/* Weekly Progression */}
      {(customCopy?.progression || autoProgression) && (
        <Section title="Weekly Progression" icon={<TrendingUp className="h-5 w-5 text-blue-400" />}>
          <div className="space-y-2">
            {customCopy?.progression ? (
              customCopy.progression.map((w: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                  <span className="font-semibold text-sm">{w.label}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Fasting: <strong className="text-foreground">{w.fastHours}</strong></span>
                    <span>Eating: <strong className="text-foreground">{w.eatHours}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              autoProgression!.map((w) => (
                <div key={w.week} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                  <span className="font-semibold text-sm">Week {w.week}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Fasting: <strong className="text-foreground">{w.fastHours}h</strong></span>
                    <span>Eating: <strong className="text-foreground">{w.eatHours}h</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      )}

      {/* Coach Guidance */}
      <Section title="Coach Guidance" icon={<Droplets className="h-5 w-5 text-blue-400" />}>
        <ul className="text-sm text-muted-foreground space-y-2">
          {(customCopy?.coachGuidance || [
            "Stay hydrated during fasting hours.",
            "Keep meals simple and protein-focused.",
            "Stop eating when comfortably satisfied.",
            "Daily movement supports metabolic health.",
          ]).map((tip: string, i: number) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </Section>

      {/* Who This Is For */}
      <Section title="Who This Is For" icon={<Users className="h-5 w-5 text-blue-400" />}>
        {customCopy ? (
          <div className="space-y-2">
            {customCopy.whoThisIsFor.map((p: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Clients who want structured {protocol.category.toLowerCase()} support without aggressive fasting.
          </p>
        )}
      </Section>
    </div>
  );
}

/* ── Quick Plan Detail (inside Sheet) ── */
function QuickPlanDetailContent({ plan }: { plan: QuickPlan }) {
  const desc = plan.description;

  return (
    <div className="px-4 pb-8 space-y-6">
      {/* Hero */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <Clock className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black leading-tight">{plan.name}</h2>
            <p className="text-xs font-bold uppercase tracking-wider mt-1 text-blue-400">Quick Plan</p>
          </div>
        </div>
        {desc?.subtitle && (
          <p className="text-sm text-muted-foreground leading-relaxed">{desc.subtitle}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
          <Clock className="h-5 w-5 mx-auto text-blue-400" />
          <p className="text-xl font-bold">{plan.fast_hours}h</p>
          <p className="text-[11px] text-muted-foreground">Fasting Window</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
          <UtensilsCrossed className="h-5 w-5 mx-auto text-blue-400" />
          <p className="text-xl font-bold">{plan.eat_hours}h</p>
          <p className="text-[11px] text-muted-foreground">Eating Window</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center space-y-1">
          <BarChart3 className="h-5 w-5 mx-auto text-blue-400" />
          <p className="text-xl font-bold capitalize">{plan.difficulty_group === "long_fasts" ? "Extended" : plan.difficulty_group}</p>
          <p className="text-[11px] text-muted-foreground">Difficulty</p>
        </div>
      </div>

      {/* Protocol Overview */}
      {desc?.how_it_works && (
        <Section title="Protocol Overview" icon={<Lightbulb className="h-5 w-5 text-blue-400" />}>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc.how_it_works}</p>
        </Section>
      )}

      {/* Benefits */}
      {desc?.benefits && desc.benefits.length > 0 && (
        <Section title="Benefits" icon={<Zap className="h-5 w-5 text-blue-400" />}>
          <ul className="space-y-2">
            {desc.benefits.map((b: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <div className="h-5 w-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="h-3 w-3 text-green-600" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Daily Structure */}
      {desc?.daily_structure && (
        <Section title="Daily Structure" icon={<CalendarDays className="h-5 w-5 text-blue-400" />}>
          <div className="space-y-2 text-sm">
            {desc.daily_structure.stop_eating && (
              <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-muted-foreground">Stop eating</span>
                <span className="font-semibold">{desc.daily_structure.stop_eating}</span>
              </div>
            )}
            {desc.daily_structure.break_fast && (
              <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="text-muted-foreground">Break fast</span>
                <span className="font-semibold">{desc.daily_structure.break_fast}</span>
              </div>
            )}
            {desc.daily_structure.meals && desc.daily_structure.meals.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Meals:</p>
                <ul className="list-disc list-inside pl-1 space-y-0.5">
                  {desc.daily_structure.meals.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {desc.daily_structure.note && (
              <p className="text-xs text-muted-foreground italic mt-2">{desc.daily_structure.note}</p>
            )}
          </div>
        </Section>
      )}

      {/* Who For */}
      {desc?.who_for && desc.who_for.length > 0 && (
        <Section title="Built For" icon={<Users className="h-5 w-5 text-blue-400" />}>
          <ul className="space-y-2">
            {desc.who_for.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Coach Guidance */}
      {desc?.coach_guidance && desc.coach_guidance.length > 0 && (
        <Section title="Coach Guidance" icon={<Droplets className="h-5 w-5 text-blue-400" />}>
          <ul className="text-sm text-muted-foreground space-y-2">
            {desc.coach_guidance.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}
