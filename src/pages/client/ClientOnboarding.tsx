import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";
import { supabase } from "@/integrations/supabase/client";
import OnboardingShell from "@/components/onboarding/premium/OnboardingShell";
import IntroStep from "@/components/onboarding/premium/steps/IntroStep";
import WelcomeStep from "@/components/onboarding/premium/steps/WelcomeStep";
import BodyMetricsStep from "@/components/onboarding/premium/steps/BodyMetricsStep";
import ActivityLevelStep from "@/components/onboarding/premium/steps/ActivityLevelStep";
import GoalsStep from "@/components/onboarding/premium/steps/GoalsStep";
import FastingExperienceStep, {
  type FastingExperienceData,
} from "@/components/onboarding/premium/steps/FastingExperienceStep";
import MetabolicSnapshotStep from "@/components/onboarding/premium/steps/MetabolicSnapshotStep";
import SystemIntroStep from "@/components/onboarding/premium/steps/SystemIntroStep";
import AICoachIntroStep from "@/components/onboarding/premium/steps/AICoachIntroStep";
import ProblemStep from "@/components/onboarding/premium/steps/ProblemStep";
import ApexPrincipleStep from "@/components/onboarding/premium/steps/ApexPrincipleStep";
import SynergyEducationStep from "@/components/onboarding/premium/steps/SynergyEducationStep";
import WhyPairingStep from "@/components/onboarding/premium/steps/WhyPairingStep";
import DailyRhythmStep, { type DailyRhythmData } from "@/components/onboarding/premium/steps/DailyRhythmStep";
import FuelPreferenceStep, { type FuelPreferenceData } from "@/components/onboarding/premium/steps/FuelPreferenceStep";
import MotivationStep from "@/components/onboarding/premium/steps/MotivationStep";
import AIPlanProposalStep from "@/components/onboarding/premium/steps/AIPlanProposalStep";
import type { AIProposal } from "@/components/client/AIPlanProposalCard";
import {
  computeSnapshot,
  type ActivityLevel,
  type Sex,
} from "@/lib/onboarding/metabolicCalc";
import { recommendSynergy } from "@/lib/onboarding/synergyRecommender";
import type { SynergyKey } from "@/lib/onboarding/synergies";

const TOTAL = 17;

interface OnboardingState {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number | null;
  activity: ActivityLevel | null;
  goals: string[];
  fastingExperience: FastingExperienceData | null;
  synergy: SynergyKey | null;
  dailyRhythm: DailyRhythmData | null;
  fuelPreference: FuelPreferenceData | null;
  motivation: string;
}

const INITIAL: OnboardingState = {
  age: 0,
  sex: "male",
  heightCm: 0,
  weightKg: 0,
  goalWeightKg: null,
  activity: null,
  goals: [],
  fastingExperience: null,
  synergy: null,
  dailyRhythm: null,
  fuelPreference: null,
  motivation: "",
};

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
  const { userRole } = useAuth();
  const { impersonatedClientId } = useImpersonation();
  const [searchParams] = useSearchParams();
  // Preview mode: trainer viewing the flow without impersonating a client, or explicit ?preview=1.
  // In preview mode we skip all database writes so the trainer's own account is never mutated.
  const isPreview =
    searchParams.get("preview") === "1" ||
    (userRole === "trainer" && !impersonatedClientId);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<OnboardingState>(INITIAL);
  const [loading, setLoading] = useState(false);

  const snap = useMemo(() => {
    if (!state.heightCm || !state.weightKg || !state.activity) return null;
    return computeSnapshot({
      age: state.age,
      sex: state.sex,
      heightCm: state.heightCm,
      weightKg: state.weightKg,
      activity: state.activity,
      goals: state.goals,
    });
  }, [state]);

  const recommended: SynergyKey | null = useMemo(() => {
    if (!snap || !state.activity) return null;
    return recommendSynergy(
      {
        age: state.age,
        sex: state.sex,
        heightCm: state.heightCm,
        weightKg: state.weightKg,
        activity: state.activity,
        goals: state.goals,
      },
      snap,
      state.fastingExperience ?? undefined,
    );
  }, [snap, state]);

  const next = () => setStep((s) => Math.min(TOTAL, s + 1));
  const back = step > 1 ? () => setStep((s) => Math.max(1, s - 1)) : undefined;

  const persistDraft = async (partial: Partial<OnboardingState>) => {
    const merged = { ...state, ...partial };
    setState(merged);
    if (!clientId || isPreview) return;
    try {
      await (supabase as any).from("onboarding_progress").upsert(
        {
          client_id: clientId,
          current_step: step + 1,
          completed: false,
          data: merged as any,
        },
        { onConflict: "client_id" },
      );
    } catch {
      // non-blocking
    }
  };

  const acceptProposal = async (proposal: AIProposal) => {
    if (!snap || !state.activity) {
      toast.error("Missing onboarding data");
      return;
    }
    if (isPreview) {
      toast.success("Preview complete — no data was saved");
      navigate("/trainer");
      return;
    }
    if (!clientId) {
      toast.error("Missing onboarding data");
      return;
    }
    setLoading(true);
    try {
      // Metabolic profile
      await (supabase as any).from("user_metabolic_profile").upsert(
        {
          client_id: clientId,
          age: state.age,
          sex: state.sex,
          height_cm: state.heightCm,
          weight_kg: state.weightKg,
          goal_weight_kg: state.goalWeightKg,
          bmi: snap.bmi,
          bmi_class: snap.bmiClass,
          activity_level: state.activity,
          goals: state.goals,
          metabolic_score: snap.metabolicScore,
          metabolic_strain: snap.strain,
          fasting_experience_level: state.fastingExperience?.experienceLevel ?? null,
          longest_fast_hours: state.fastingExperience?.longestFastHours ?? null,
          fasting_tolerance: state.fastingExperience?.tolerance ?? null,
          safety_flags: state.fastingExperience?.safetyFlags ?? [],
        },
        { onConflict: "client_id" },
      );

      // Apply the AI-proposed plan to client_feature_settings so it drives
      // the fasting timer, Live Schedule, and dashboard immediately.
      await (supabase as any).from("client_feature_settings").upsert(
        {
          client_id: clientId,
          selected_protocol_id: proposal.protocol_id,
          selected_quick_plan_id: null,
          protocol_start_date: new Date().toISOString().slice(0, 10),
          assigned_protocol_duration_days: proposal.duration_days,
          protocol_run_mode: "recurring",
        },
        { onConflict: "client_id" },
      );

      // Seed the weekly schedule with the AI-picked window.
      const weeklyRows = Array.from({ length: 7 }, (_, dow) => ({
        client_id: clientId,
        day_of_week: dow,
        ratio: `${proposal.fast_hours}:${proposal.eat_hours}`,
        window_start_time: `${proposal.window_end_time}:00`, // fast starts at last-meal time
        window_end_time: `${proposal.window_start_time}:00`, // fast breaks at break-fast time
        enabled: proposal.weekly_pattern === "weekdays_only" ? dow >= 1 && dow <= 5 : true,
      }));
      await (supabase as any)
        .from("client_weekly_schedule")
        .upsert(weeklyRows, { onConflict: "client_id,day_of_week" });

      // Onboarding progress complete
      await (supabase as any).from("onboarding_progress").upsert(
        {
          client_id: clientId,
          current_step: TOTAL,
          completed: true,
          completed_at: new Date().toISOString(),
          data: { ...state, accepted_plan: proposal } as any,
        },
        { onConflict: "client_id" },
      );

      // Profile flag + auto-seed weight/height as a progress entry
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", clientId);

      await supabase.from("progress_entries").insert({
        client_id: clientId,
        weight: state.weightKg ? +(state.weightKg * 2.20462).toFixed(1) : null,
        notes: state.heightCm ? `Height: ${state.heightCm} cm` : null,
      });

      toast.success("Your Apex360 AI plan is live");
      navigate("/client/dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not activate plan");
    } finally {
      setLoading(false);
    }
  };

  const onboardingPayload = useMemo(
    () => ({
      age: state.age,
      sex: state.sex,
      heightCm: state.heightCm,
      weightKg: state.weightKg,
      goalWeightKg: state.goalWeightKg,
      activity: state.activity,
      goals: state.goals,
      bmi: snap?.bmi ?? null,
      metabolicScore: snap?.metabolicScore ?? null,
      fastingExperience: state.fastingExperience,
      dailyRhythm: state.dailyRhythm,
      fuelPreference: state.fuelPreference,
      motivation: state.motivation,
      recommendedSynergyHint: recommended,
    }),
    [state, snap, recommended],
  );

  return (
    <OnboardingShell
      step={step}
      totalSteps={TOTAL}
      onBack={back}
      showParticles={step <= 2 || step === TOTAL}
    >
      {step === 1 && <IntroStep onNext={next} />}
      {step === 2 && <SystemIntroStep onNext={next} />}
      {step === 3 && <SynergyEducationStep onNext={next} />}
      {step === 4 && <AICoachIntroStep onNext={next} />}
      {step === 5 && <WhyPairingStep onNext={next} />}
      {step === 6 && <WelcomeStep onNext={next} />}
      {step === 7 && (
        <BodyMetricsStep
          initial={{
            age: state.age,
            sex: state.sex,
            heightCm: state.heightCm,
            weightKg: state.weightKg,
            goalWeightKg: state.goalWeightKg,
          }}
          onNext={(d) => {
            persistDraft(d);
            next();
          }}
        />
      )}
      {step === 8 && (
        <ActivityLevelStep
          initial={state.activity}
          onNext={(a) => {
            persistDraft({ activity: a });
            next();
          }}
        />
      )}
      {step === 9 && (
        <GoalsStep
          initial={state.goals}
          onNext={(g) => {
            persistDraft({ goals: g });
            next();
          }}
        />
      )}
      {step === 10 && (
        <FastingExperienceStep
          initial={state.fastingExperience}
          onNext={(d) => {
            persistDraft({ fastingExperience: d });
            next();
          }}
        />
      )}
      {step === 11 && (
        <DailyRhythmStep
          initial={state.dailyRhythm}
          onNext={(d) => {
            persistDraft({ dailyRhythm: d });
            next();
          }}
        />
      )}
      {step === 12 && (
        <FuelPreferenceStep
          initial={state.fuelPreference}
          onNext={(d) => {
            persistDraft({ fuelPreference: d });
            next();
          }}
        />
      )}
      {step === 13 && (
        <MotivationStep
          initial={state.motivation}
          onNext={(m) => {
            persistDraft({ motivation: m });
            next();
          }}
        />
      )}
      {step === 14 && snap && (
        <MetabolicSnapshotStep
          snap={snap}
          bmi={snap.bmi}
          bmiClass={snap.bmiClass}
          sex={state.sex}
          onNext={next}
        />
      )}
      {step === 15 && (
        <AIPlanProposalStep
          clientId={clientId ?? null}
          onboardingPayload={onboardingPayload}
          isPreview={isPreview}
          onAccept={(p) => acceptProposal(p)}
          onAdjust={(p) => acceptProposal(p)}
        />
      )}
    </OnboardingShell>
  );
}
