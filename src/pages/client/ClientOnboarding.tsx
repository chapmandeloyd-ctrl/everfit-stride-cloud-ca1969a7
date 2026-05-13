import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { supabase } from "@/integrations/supabase/client";
import OnboardingShell from "@/components/onboarding/premium/OnboardingShell";
import WelcomeStep from "@/components/onboarding/premium/steps/WelcomeStep";
import BodyMetricsStep from "@/components/onboarding/premium/steps/BodyMetricsStep";
import ActivityLevelStep from "@/components/onboarding/premium/steps/ActivityLevelStep";
import GoalsStep from "@/components/onboarding/premium/steps/GoalsStep";
import MetabolicSnapshotStep from "@/components/onboarding/premium/steps/MetabolicSnapshotStep";
import SystemIntroStep from "@/components/onboarding/premium/steps/SystemIntroStep";
import CoachingStyleStep from "@/components/onboarding/premium/steps/CoachingStyleStep";
import FastingSynergyStep from "@/components/onboarding/premium/steps/FastingSynergyStep";
import FirstWeekStep from "@/components/onboarding/premium/steps/FirstWeekStep";
import ActivateStep from "@/components/onboarding/premium/steps/ActivateStep";
import {
  computeSnapshot,
  type ActivityLevel,
  type Sex,
} from "@/lib/onboarding/metabolicCalc";
import { recommendSynergy } from "@/lib/onboarding/synergyRecommender";
import type { SynergyKey } from "@/lib/onboarding/synergies";

const TOTAL = 10;

interface OnboardingState {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number | null;
  activity: ActivityLevel | null;
  goals: string[];
  coachingStyle: "guided" | "self" | null;
  synergy: SynergyKey | null;
}

const INITIAL: OnboardingState = {
  age: 0,
  sex: "male",
  heightCm: 0,
  weightKg: 0,
  goalWeightKg: null,
  activity: null,
  goals: [],
  coachingStyle: null,
  synergy: null,
};

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const clientId = useEffectiveClientId();
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
    );
  }, [snap, state]);

  const next = () => setStep((s) => Math.min(TOTAL, s + 1));
  const back = step > 1 ? () => setStep((s) => Math.max(1, s - 1)) : undefined;

  const persistDraft = async (partial: Partial<OnboardingState>) => {
    if (!clientId) return;
    const merged = { ...state, ...partial };
    setState(merged);
    try {
      await supabase.from("onboarding_progress").upsert(
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

  const finalize = async (target: "dashboard") => {
    if (!clientId || !snap || !state.activity || !state.synergy || !state.coachingStyle) {
      toast.error("Missing onboarding data");
      return;
    }
    setLoading(true);
    try {
      // Metabolic profile
      await supabase.from("user_metabolic_profile").upsert(
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
        },
        { onConflict: "client_id" },
      );

      // Synergy
      await supabase.from("fasting_synergy_selection").upsert(
        {
          client_id: clientId,
          synergy_key: state.synergy,
          coaching_style: state.coachingStyle,
          recommended_synergy: recommended,
          selected_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      );

      // Onboarding progress complete
      await supabase.from("onboarding_progress").upsert(
        {
          client_id: clientId,
          current_step: TOTAL,
          completed: true,
          completed_at: new Date().toISOString(),
          data: state as any,
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

      toast.success("Welcome to KSOM360");
      navigate(target === "dashboard" ? "/client/dashboard" : "/client/dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not activate plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      step={step}
      totalSteps={TOTAL}
      onBack={back}
      showParticles={step <= 2 || step === 10}
    >
      {step === 1 && <WelcomeStep onNext={next} />}
      {step === 2 && (
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
      {step === 3 && (
        <ActivityLevelStep
          initial={state.activity}
          onNext={(a) => {
            persistDraft({ activity: a });
            next();
          }}
        />
      )}
      {step === 4 && (
        <GoalsStep
          initial={state.goals}
          onNext={(g) => {
            persistDraft({ goals: g });
            next();
          }}
        />
      )}
      {step === 5 && snap && (
        <MetabolicSnapshotStep
          snap={snap}
          bmi={snap.bmi}
          bmiClass={snap.bmiClass}
          sex={state.sex}
          onNext={next}
        />
      )}
      {step === 6 && <SystemIntroStep onNext={next} />}
      {step === 7 && (
        <CoachingStyleStep
          initial={state.coachingStyle}
          onNext={(s) => {
            persistDraft({ coachingStyle: s });
            next();
          }}
        />
      )}
      {step === 8 && recommended && (
        <FastingSynergyStep
          recommended={recommended}
          initial={state.synergy}
          onNext={(k) => {
            persistDraft({ synergy: k });
            next();
          }}
        />
      )}
      {step === 9 && state.synergy && (
        <FirstWeekStep synergyKey={state.synergy} onNext={next} />
      )}
      {step === 10 && (
        <ActivateStep
          loading={loading}
          onActivate={() => finalize("dashboard")}
          onExplore={() => finalize("dashboard")}
        />
      )}
    </OnboardingShell>
  );
}
