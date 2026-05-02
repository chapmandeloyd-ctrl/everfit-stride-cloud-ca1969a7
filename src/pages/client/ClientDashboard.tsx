import { ClientLayout } from "@/components/ClientLayout";
import fastingCardBgGoldImg from "@/assets/fasting-timer-bg-gold.png";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Dumbbell, CheckCircle2, Circle, UtensilsCrossed, Footprints, ChevronRight, Smartphone, X, Plus, Pencil, Swords, Trophy, MapPin, Check, Activity, ScanBarcode, Camera, PenLine, MessageCircle, Clock, ArrowRight, CalendarDays, BarChart3, Shield, Droplet } from "lucide-react";
import { getDifficultyLabel, getDurationLabel } from "@/lib/fastingCategoryConfig";
import { useAuth } from "@/hooks/useAuth";
import { differenceInCalendarDays, isToday, isBefore, startOfDay, parseISO, format } from "date-fns";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { emitActivityEvent } from "@/lib/activityEvents";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { useEngineMode } from "@/hooks/useEngineMode";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useImpersonation } from "@/hooks/useImpersonation";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getDietStylePreset } from "@/lib/dietStyles";
import { SportEventCompletionDialog } from "@/components/SportEventCompletionDialog";

// Mirror of getCutLevelMeta on ClientNutrition page so dashboard card stays in sync.
function getCutLevelMeta(adjustment?: number | null) {
  const pct = Math.round((adjustment ?? 0) * 100);
  if (pct <= -75) return { label: "Maximum Cut", dot: "bg-red-500", text: "text-red-500" };
  if (pct <= -65) return { label: "Extreme Deficit", dot: "bg-red-500", text: "text-red-500" };
  if (pct <= -45) return { label: "Aggressive Cut", dot: "bg-orange-500", text: "text-orange-500" };
  if (pct <= -25) return { label: "Heavy Cut", dot: "bg-orange-500", text: "text-orange-500" };
  if (pct <= -10) return { label: "Moderate Cut", dot: "bg-emerald-500", text: "text-emerald-500" };
  if (pct < 0) return { label: "Light Cut", dot: "bg-emerald-500", text: "text-emerald-500" };
  if (pct === 0) return { label: "Maintain", dot: "bg-muted-foreground", text: "text-muted-foreground" };
  if (pct <= 10) return { label: "Lean Bulk", dot: "bg-sky-500", text: "text-sky-500" };
  if (pct <= 20) return { label: "Surplus", dot: "bg-sky-500", text: "text-sky-500" };
  return { label: "Aggressive Bulk", dot: "bg-sky-500", text: "text-sky-500" };
}
import { DayStripCalendar } from "@/components/DayStripCalendar";
import { QuickCardioFlow } from "@/components/cardio/QuickCardioFlow";
import { CardioDetailSheet } from "@/components/cardio/CardioDetailSheet";
import { SwipeToDeleteCardioRow } from "@/components/cardio/SwipeToDeleteCardioRow";
import { getIconComponent as getCardioIconComponent } from "@/components/cardio/cardioActivities";
import { SwipeToDeleteWorkoutRow } from "@/components/workout/SwipeToDeleteWorkoutRow";
import { SwipeToDeleteTaskRow } from "@/components/tasks/SwipeToDeleteTaskRow";
import { SpeedDialFAB } from "@/components/SpeedDialFAB";
import { FastingStatusCard } from "@/components/client/FastingStatusCard";
import { BuildWorkoutSheet } from "@/components/workout/BuildWorkoutSheet";

import { ProgramsSelector } from "@/components/ProgramsSelector";
import { FastingTimer } from "@/components/FastingTimer";
// FastingStagesGuide moved to /client/stages route (bottom nav)
import { CreatePinDialog, VerifyPinDialog, HoldToEndButton } from "@/components/FastingPinLock";
import { FastingCoachTipCard } from "@/components/FastingCoachTipCard";
import { ProtocolCompletionDialog } from "@/components/ProtocolCompletionDialog";
import { MyProgressSection } from "@/components/MyProgressSection";
import { EndFastEarlySheet } from "@/components/fasting/EndFastEarlySheet";
import { EndEatingWindowEarlySheet } from "@/components/fasting/EndEatingWindowEarlySheet";
import { WhatCanIDrinkSheet } from "@/components/fasting/WhatCanIDrinkSheet";
import { BeveragesTodayCard } from "@/components/fasting/BeveragesTodayCard";
import { SmartPaceBanner } from "@/components/smart-pace/SmartPaceBanner";
import { SmartPaceCatchUpModal } from "@/components/smart-pace/SmartPaceCatchUpModal";
import { MyWhyCard } from "@/components/goal-motivation/MyWhyCard";
import { DailyCheckInCard } from "@/components/goal-motivation/DailyCheckInCard";
import { DailyJournalCard } from "@/components/daily-journal/DailyJournalCard";
import { useSmartPace } from "@/hooks/useSmartPace";

import { InAppNotifications } from "@/components/InAppNotifications";
import { useDashboardLayoutClient } from "@/hooks/useDashboardLayoutClient";
import { SportHeroBanner } from "@/components/SportHeroBanner";
import { AssignedPlanCard } from "@/components/dashboard/AssignedPlanCard";
import { AskKsomAI } from "@/components/client/AskKsomAI";
import { MetabolicControlDashboard } from "@/components/dashboard/MetabolicControlDashboard";
import { DailyScoreRing } from "@/components/dashboard/DailyScoreRing";
import { MealDecisionCard } from "@/components/dashboard/MealDecisionCard";
import { ProgressionUnlocksCard } from "@/components/dashboard/ProgressionUnlocksCard";
import { useConsistencyStreak } from "@/hooks/useConsistencyStreak";
import { useLiveActivity } from "@/hooks/useLiveActivity";
import { CoachingCard } from "@/components/dashboard/CoachingCard";
import { WelcomeCard } from "@/components/client/WelcomeCard";

const SHOW_WEIGHT_TRACKER = false;

// Fasting Program Card sub-component
export function FastingProtocolCard({ clientId, navigate, openEndFastFlowSignal = 0 }: { clientId: string | null; navigate: (path: string) => void; openEndFastFlowSignal?: number }) {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showEndEatingWindowConfirm, setShowEndEatingWindowConfirm] = useState(false);
  const [showCloseEatingWindowConfirm, setShowCloseEatingWindowConfirm] = useState(false);
  const [showEndFastEarlySheet, setShowEndFastEarlySheet] = useState(false);
  const [showEndEatingWindowSheet, setShowEndEatingWindowSheet] = useState(false);
  const [showWhatCanIDrink, setShowWhatCanIDrink] = useState(false);
  const [eatingWindowSheetIntent, setEatingWindowSheetIntent] = useState<"end_window" | "choose_next_fast">("end_window");
  const liveActivity = useLiveActivity();
  const { toast } = useToast();

  const { data: featureSettings } = useQuery({
    queryKey: ["my-feature-settings-fasting", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, selected_quick_plan_id, protocol_start_date, active_fast_start_at, active_fast_target_hours, last_fast_ended_at, last_fast_completed_at, eating_window_ends_at, eating_window_hours, fasting_strict_mode, protocol_assigned_by, fasting_card_subtitle, fasting_card_image_url, eating_window_card_image_url, fast_lock_pin, protocol_completed, maintenance_mode, maintenance_schedule_type, trainer_id, lock_client_plan_choice")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        selected_protocol_id: string | null;
        selected_quick_plan_id: string | null;
        protocol_start_date: string | null;
        active_fast_start_at: string | null;
        active_fast_target_hours: number | null;
        last_fast_ended_at: string | null;
        last_fast_completed_at: string | null;
        eating_window_ends_at: string | null;
        eating_window_hours: number;
        fasting_strict_mode: boolean;
        protocol_assigned_by: string | null;
        fasting_card_subtitle: string | null;
        fasting_card_image_url: string | null;
        eating_window_card_image_url: string | null;
        fast_lock_pin: string | null;
        protocol_completed: boolean;
        maintenance_mode: boolean;
        maintenance_schedule_type: string | null;
        trainer_id: string;
        lock_client_plan_choice: boolean;
      } | null;
    },
    enabled: !!clientId,
  });

  // Fetch universal fasting card from trainer
  const { data: universalFastingCard } = useQuery({
    queryKey: ["trainer-fasting-card-client", featureSettings?.trainer_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_fasting_cards")
        .select("*")
        .eq("trainer_id", featureSettings!.trainer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!featureSettings?.trainer_id,
  });

  const { data: activeProtocol } = useQuery({
    queryKey: ["active-fasting-protocol", featureSettings?.selected_protocol_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .eq("id", featureSettings!.selected_protocol_id!)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; duration_days: number; fast_target_hours: number; difficulty_level: string };
    },
    enabled: !!featureSettings?.selected_protocol_id,
  });

  // Fetch active quick plan details when one is selected
  const { data: activeQuickPlan } = useQuery({
    queryKey: ["active-quick-plan", featureSettings?.selected_quick_plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quick_fasting_plans")
        .select("id, name, fast_hours, intensity_tier")
        .eq("id", featureSettings!.selected_quick_plan_id!)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; fast_hours: number; intensity_tier: string };
    },
    enabled: !!featureSettings?.selected_quick_plan_id,
  });

  // Fetch active keto type for display
  const { data: activeKetoType } = useQuery({
    queryKey: ["fasting-card-keto-type", clientId],
    queryFn: async () => {
      const { data: assignment } = await supabase
        .from("client_keto_assignments")
        .select("keto_type_id, keto_types (name, abbreviation, color, fat_pct, protein_pct, carbs_pct)")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      return (assignment as any)?.keto_types || null;
    },
    enabled: !!clientId,
  });

  // Meal slideshow photos for the eating window card
  const { data: mealPhotos = [] } = useQuery({
    queryKey: ["eating-window-meal-photos", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eating_window_meal_photos")
        .select("image_url")
        .eq("client_id", clientId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []).map((p: any) => p.image_url as string);
    },
    enabled: !!clientId,
  });
  // Fetch today's fasting log for post-fast summary
  const todayDate = format(now, "yyyy-MM-dd");
  const { data: todayFastLog } = useQuery({
    queryKey: ["today-fasting-log", clientId, todayDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_log")
        .select("*")
        .eq("client_id", clientId!)
        .gte("ended_at", `${todayDate}T00:00:00`)
        .lte("ended_at", `${todayDate}T23:59:59`)
        .order("ended_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const isFasting = !!featureSettings?.active_fast_start_at;
  const hasEatingWindow = !!featureSettings?.eating_window_ends_at && new Date(featureSettings.eating_window_ends_at) > now;

  // Tick every second while fasting or eating window is active
  useEffect(() => {
    if (!isFasting && !hasEatingWindow) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isFasting, hasEatingWindow]);

  // Auto-rotate slideshow every 4 seconds
  useEffect(() => {
    if (mealPhotos.length < 2) return;
    const interval = setInterval(() => {
      setSlideshowIndex((prev) => (prev + 1) % mealPhotos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mealPhotos.length]);

  useEffect(() => {
    if (!openEndFastFlowSignal || !isFasting) return;
    setShowEndFastEarlySheet(true);
  }, [openEndFastFlowSignal, isFasting]);

  // Live Activity: show fasting timer on lock screen & Dynamic Island, update every 10s
  useEffect(() => {
    if (!isFasting || !featureSettings?.active_fast_start_at || !featureSettings?.active_fast_target_hours) return;
    const targetHours = featureSettings.active_fast_target_hours;
    const startAt = new Date(featureSettings.active_fast_start_at).getTime();
    const totalSeconds = targetHours * 3600;

    const elapsedSec = Math.floor((Date.now() - startAt) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsedSec);
    liveActivity.start({
      activityType: 'fasting',
      title: activeProtocol?.name || activeQuickPlan?.name || 'Fasting Timer',
      subtitle: `${targetHours}h fast`,
      mode: 'countDown',
      seconds: remaining,
      accentColor: '#10B981',
      icon: 'fork.knife.circle',
    });

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAt) / 1000);
      const rem = Math.max(0, totalSeconds - elapsed);
      liveActivity.update({ seconds: rem });
    }, 10000);
    return () => clearInterval(interval);
  }, [isFasting, featureSettings?.active_fast_start_at, featureSettings?.active_fast_target_hours]);

  const startFastMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("No client selected");
      const targetHours = activeProtocol?.fast_target_hours || featureSettings?.active_fast_target_hours || 16;
      const startedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("client_feature_settings")
        .update({
          active_fast_start_at: startedAt,
          active_fast_target_hours: targetHours,
          last_fast_ended_at: null,
          eating_window_ends_at: null,
        })
        .eq("client_id", clientId)
        .select("client_id, active_fast_start_at, active_fast_target_hours")
        .maybeSingle();
      if (error) throw error;
      if (!data?.active_fast_start_at || !data?.active_fast_target_hours) {
        throw new Error("Fast timer could not be started.");
      }

      // Timeline event
      emitActivityEvent({
        clientId: clientId!,
        eventType: "fast_started",
        title: "Fast started",
        subtitle: `${data.active_fast_target_hours}h target`,
        category: "fasting",
        icon: "play",
        metadata: { target_hours: data.active_fast_target_hours, protocol_id: activeProtocol?.id ?? null },
      });

      return {
        targetHours: data.active_fast_target_hours,
      };
    },
    onSuccess: ({ targetHours }) => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
      queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
      // Start Live Activity for lock screen timer
      const totalSeconds = targetHours * 3600;
      liveActivity.start({
        activityType: 'fasting',
        title: activeProtocol?.name || activeQuickPlan?.name || 'Fasting Timer',
        subtitle: `${targetHours}h fast`,
        mode: 'countDown',
        seconds: totalSeconds,
        accentColor: '#10B981',
        icon: 'fork.knife.circle',
      });
      // Show PIN creation dialog after starting fast
      setShowCreatePin(true);
    },
    onError: (err) => {
      console.error("Start fast error:", err);
      toast({
        title: "Timer didn't start",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const endFastMutation = useMutation({
    mutationFn: async (intervention?: void | {
      reason: string;
      actionAttempted: string | null;
      note: string;
      aiSuggestionShown: boolean;
      aiSuggestionText: string | null;
      elapsedHours: number;
    }) => {
      const nowTs = new Date();
      const startAt = featureSettings?.active_fast_start_at;
      const targetHours = featureSettings?.active_fast_target_hours || 16;
      const trainerId = featureSettings?.trainer_id;

      // Calculate actual hours fasted
      const actualMs = startAt ? nowTs.getTime() - new Date(startAt).getTime() : 0;
      const actualHours = Math.round((actualMs / 3600000) * 100) / 100;
      const completionPct = Math.min(Math.round((actualHours / targetHours) * 100), 100);
      const endedEarly = actualHours < targetHours;

      const eatingWindowHours = featureSettings?.eating_window_hours || 8;
      const shouldOpenEatingWindow = !endedEarly;
      const eatingWindowEnd = shouldOpenEatingWindow
        ? new Date(nowTs.getTime() + eatingWindowHours * 3600000).toISOString()
        : null;

      // Update feature settings
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          last_fast_ended_at: nowTs.toISOString(),
          last_fast_completed_at: shouldOpenEatingWindow
            ? nowTs.toISOString()
            : featureSettings?.last_fast_completed_at ?? null,
          active_fast_start_at: null,
          active_fast_target_hours: null,
          eating_window_ends_at: eatingWindowEnd,
          fast_lock_pin: null,
        })
        .eq("client_id", clientId);
      if (error) throw error;

      // Log to fasting_log
      if (startAt && trainerId) {
        await supabase.from("fasting_log").insert({
          client_id: clientId!,
          trainer_id: trainerId,
          started_at: startAt,
          ended_at: nowTs.toISOString(),
          target_hours: targetHours,
          actual_hours: actualHours,
          completion_pct: completionPct,
          status: endedEarly ? "partial" : "completed",
          ended_early: endedEarly,
        });
      }

      // Log early-end intervention metadata for the coach + adaptive engine
      if (endedEarly && clientId && intervention) {
        try {
          await supabase.from("early_session_ends").insert({
            client_id: clientId,
            session_type: "fast",
            elapsed_hours: intervention.elapsedHours,
            target_hours: targetHours,
            percent_complete: completionPct,
            reason: intervention.reason,
            action_attempted: intervention.actionAttempted,
            ai_suggestion_shown: intervention.aiSuggestionShown,
            ai_suggestion_text: intervention.aiSuggestionText,
            note: intervention.note || null,
          });
        } catch (e) {
          console.warn("early_session_ends insert failed:", e);
        }
      }

      // Fire Zapier webhook (fast_completed or fast_broken). Fire-and-forget;
      // dedup is handled server-side by reference_id.
      if (startAt && clientId) {
        try {
          supabase.functions.invoke("fire-zapier-webhook", {
            body: {
              client_id: clientId,
              event_type: endedEarly ? "fast_broken" : "fast_completed",
              reference_id: `${startAt}:${endedEarly ? "fast_broken" : "fast_completed"}`,
              target_hours: targetHours,
              actual_hours: actualHours,
            },
          });
        } catch (e) {
          console.warn("Zapier webhook invoke failed:", e);
        }
      }

      // Timeline event
      if (clientId) {
        emitActivityEvent({
          clientId,
          eventType: endedEarly ? "fast_ended_early" : "fast_completed",
          title: endedEarly ? "Fast ended early" : "Fast completed",
          subtitle: `${actualHours.toFixed(1)}h of ${targetHours}h (${completionPct}%)`,
          category: "fasting",
          icon: endedEarly ? "stop-circle" : "check-circle",
          metadata: { actual_hours: actualHours, target_hours: targetHours, completion_pct: completionPct, reason: (intervention && (intervention as any).reason) ?? null },
        });
        if (shouldOpenEatingWindow) {
          emitActivityEvent({
            clientId,
            eventType: "eating_window_opened",
            title: "Fuel Phase started",
            subtitle: `${eatingWindowHours}h window`,
            category: "eating",
            icon: "utensils",
            metadata: { window_hours: eatingWindowHours },
          });
        }
      }
      return { endedEarly };
    },
    onSuccess: (result) => {
      liveActivity.stop(); // Dismiss lock screen timer
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["today-fasting-log"] });
      if (result?.endedEarly) {
        toast({
          title: "Fast ended early",
          description: "Part 1 ended before target, so no Fuel Phase or keto window was opened.",
        });
        navigate("/client/dashboard");
        return;
      }

      navigate("/client/fast-complete");
    },
  });

  // End the fast AND skip the Fuel Phase entirely.
  // Logs to fasting_log so time-fasted credit is preserved (status="partial" if <target,
  // "completed" if user is at goal). Does NOT start an eating window.
  // Optionally notifies the trainer. Returns the user to the Today screen.
  const endFastSkipFuelMutation = useMutation({
    mutationFn: async (intervention: {
      reason: string;
      actionAttempted: string | null;
      note: string;
      aiSuggestionShown: boolean;
      aiSuggestionText: string | null;
      elapsedHours: number;
      notifyTrainer: boolean;
    }) => {
      const nowTs = new Date();
      const startAt = featureSettings?.active_fast_start_at;
      const targetHours = featureSettings?.active_fast_target_hours || 16;
      const trainerId = featureSettings?.trainer_id;

      const actualMs = startAt ? nowTs.getTime() - new Date(startAt).getTime() : 0;
      const actualHours = Math.round((actualMs / 3600000) * 100) / 100;
      const completionPct = Math.min(Math.round((actualHours / targetHours) * 100), 100);
      const endedEarly = actualHours < targetHours;
      const earnedCredit = actualHours >= 1; // 1h+ counts toward fasting time

      // Clear active fast WITHOUT starting an eating window
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          last_fast_ended_at: nowTs.toISOString(),
          last_fast_completed_at: endedEarly
            ? featureSettings?.last_fast_completed_at ?? null
            : nowTs.toISOString(),
          active_fast_start_at: null,
          active_fast_target_hours: null,
          eating_window_ends_at: null, // <- key difference: no Fuel Phase
          fast_lock_pin: null,
        })
        .eq("client_id", clientId);
      if (error) throw error;

      // Log to fasting_log so the user gets credit for time fasted
      if (startAt && trainerId && earnedCredit) {
        await supabase.from("fasting_log").insert({
          client_id: clientId!,
          trainer_id: trainerId,
          started_at: startAt,
          ended_at: nowTs.toISOString(),
          target_hours: targetHours,
          actual_hours: actualHours,
          completion_pct: completionPct,
          status: endedEarly ? "partial" : "completed",
          ended_early: endedEarly,
        });
      }

      // Always log the intervention so the coach + adaptive engine see why
      if (clientId) {
        try {
          await supabase.from("early_session_ends").insert({
            client_id: clientId,
            session_type: "fast",
            elapsed_hours: intervention.elapsedHours,
            target_hours: targetHours,
            percent_complete: completionPct,
            reason: intervention.reason || "skipped_fuel",
            action_attempted: intervention.actionAttempted,
            ai_suggestion_shown: intervention.aiSuggestionShown,
            ai_suggestion_text: intervention.aiSuggestionText,
            note: [intervention.note, "Fuel Phase skipped"].filter(Boolean).join(" — ") || null,
          });
        } catch (e) {
          console.warn("early_session_ends insert failed:", e);
        }
      }

      // Optional trainer notification (uses the same channel as the just-started "alert trainer" path)
      if (intervention.notifyTrainer) {
        await notifyTrainerFastCancelled("end_and_notify", intervention.elapsedHours);
      }

      // Timeline event
      if (clientId) {
        emitActivityEvent({
          clientId,
          eventType: "fast_ended_early",
          title: "Fast ended — Fuel Phase skipped",
          subtitle: earnedCredit
            ? `${actualHours.toFixed(1)}h logged · returned to Today`
            : `${actualHours.toFixed(1)}h · no credit (under 1h)`,
          category: "fasting",
          icon: "stop-circle",
          metadata: {
            actual_hours: actualHours,
            target_hours: targetHours,
            reason: intervention.reason || "skipped_fuel",
            notified_trainer: intervention.notifyTrainer,
            credit_earned: earnedCredit,
          },
        });
      }

      return { earnedCredit, actualHours };
    },
    onSuccess: ({ earnedCredit, actualHours }) => {
      liveActivity.stop();
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      queryClient.invalidateQueries({ queryKey: ["today-fasting-log"] });
      toast({
        title: "Fast ended · Fuel Phase skipped",
        description: earnedCredit
          ? `You're back on Today. Credit logged for ${actualHours.toFixed(1)}h fasted.`
          : "You're back on Today. Start a fresh fast whenever you're ready.",
      });
      navigate("/client/dashboard");
    },
    onError: (err) => {
      console.error("End fast / skip Fuel error:", err);
      toast({
        title: "Couldn't end the fast",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-end fast when timer reaches 100%
  const fastCompleted = isFasting && featureSettings?.active_fast_start_at && featureSettings?.active_fast_target_hours
    ? (now.getTime() - new Date(featureSettings.active_fast_start_at).getTime()) >= featureSettings.active_fast_target_hours * 3600000
    : false;

  useEffect(() => {
    if (fastCompleted && !endFastMutation.isPending) {
      endFastMutation.mutate();
    }
  }, [fastCompleted]);

  const cancelProtocolMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          selected_protocol_id: null,
          protocol_start_date: null,
          protocol_assigned_by: null,
          active_fast_start_at: null,
          active_fast_target_hours: null,
          eating_window_ends_at: null,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
    },
  });

  // Clean cancel for "I tapped start by mistake" within first 15 min.
  // Clears the active fast WITHOUT logging it, WITHOUT starting an eating window,
  // and WITHOUT touching the protocol selection. No penalty, no record.
  const cancelMistakenFastMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          active_fast_start_at: null,
          active_fast_target_hours: null,
          fast_lock_pin: null,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      liveActivity.stop();
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      queryClient.invalidateQueries({ queryKey: ["fasting-gate-state"] });
      toast({
        title: "No worries — fast cancelled",
        description: "Start a fast whenever you're ready.",
      });
    },
    onError: (err) => {
      toast({
        title: "Couldn't cancel",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fire-and-forget trainer alert (in-app + push + email) when client ends a
  // just-started fast and asks to reschedule.
  const notifyTrainerFastCancelled = async (kind: "cancel" | "end_and_notify", elapsedHours: number) => {
    if (!clientId) return;
    try {
      await supabase.functions.invoke("notify-trainer-fast-cancelled", {
        body: {
          client_id: clientId,
          kind,
          elapsed_minutes: Math.max(0, Math.round(elapsedHours * 60)),
          target_hours: featureSettings?.active_fast_target_hours ?? null,
        },
      });
    } catch (e) {
      console.warn("notify-trainer-fast-cancelled invoke failed:", e);
    }
  };
  const fastingSubtitle = featureSettings?.fasting_card_subtitle || "Fasting is the foundation of your plan.";
  const fastingTitle = (featureSettings as any)?.fasting_card_title || "KSOM-360";

  // No protocol selected — empty state
  const hasQuickPlan = !!featureSettings?.selected_quick_plan_id && !!activeQuickPlan;
  const hasProtocol = !!featureSettings?.selected_protocol_id && !!activeProtocol;

  const isCoachAssigned = !!featureSettings?.protocol_assigned_by;
  const planName = activeProtocol?.name 
    || (activeQuickPlan ? `${activeQuickPlan.fast_hours}h Fast` : null)
    || `${featureSettings?.active_fast_target_hours || 16}h Fast`;
  const hasDuration = !!activeProtocol?.duration_days;

  const startDate = featureSettings?.protocol_start_date ? new Date(featureSettings.protocol_start_date + "T00:00:00") : new Date();
  const dayNumber = hasDuration ? Math.min(differenceInCalendarDays(new Date(), startDate) + 1, activeProtocol!.duration_days) : 0;

  // Protocol completion detection
  const isProtocolComplete = hasProtocol && hasDuration && dayNumber >= activeProtocol!.duration_days && !featureSettings?.protocol_completed;

  // Auto-show completion dialog when protocol day reaches duration
  useEffect(() => {
    if (isProtocolComplete && !showCompletion) {
      setShowCompletion(true);
    }
  }, [isProtocolComplete]);

  // Continue current routine mutation
  const continueRoutineMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ protocol_completed: true })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
    },
  });

  // Switch to maintenance schedule mutation
  const switchToMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          maintenance_mode: true,
          selected_protocol_id: null,
          protocol_start_date: null,
          protocol_assigned_by: null,
          protocol_completed: false,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      navigate("/client/choose-protocol");
    },
  });

  const isMaintenanceMode = !!featureSettings?.maintenance_mode;

  const maintenanceLabel = featureSettings?.maintenance_schedule_type
    ? ({ "16:8_daily": "16:8 Daily", "16:8_weekdays": "16:8 Weekdays", "14:10_daily": "14:10 Daily", "flexible": "Flexible Fasting" } as Record<string, string>)[featureSettings.maintenance_schedule_type] || featureSettings.maintenance_schedule_type
    : null;

  // ───────────────────────────────────────────────────────────────────
  // PROGRAM PAIRING GATE
  // A program is "fully assigned" only when BOTH halves exist:
  //   1. A fasting protocol (or quick plan)
  //   2. A keto type
  // When NOT fully assigned we still render the lion card shell with the
  // gold "View Protocol" / "View Keto Type" pills, but we hide the
  // "Fasting Protocol / 16h Fast / Coach Assigned" header, the stats
  // tiles, and the "View Your Assigned Program" button — those only
  // appear once both halves are paired together.
  // Applies to both client view and admin/trainer impersonation view
  // (ClientDashboardMinimal renders this same component).
  // ───────────────────────────────────────────────────────────────────
  const hasAnyProtocol = !!featureSettings?.selected_protocol_id || !!featureSettings?.selected_quick_plan_id;
  const hasKetoType = !!activeKetoType;
  const programFullyAssigned = hasAnyProtocol && hasKetoType;

  // Maintenance mode idle state
  if (isMaintenanceMode && !isFasting && !hasEatingWindow) {
    return (
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardContent className="px-5 pt-8 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maintenance Schedule</p>
              <h3 className="text-base font-bold mt-0.5">{maintenanceLabel || "Maintenance"}</h3>
            </div>
            <Badge variant="secondary" className="text-xs">Maintenance</Badge>
          </div>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Maintain your fasting routine at your own pace.</p>
          </div>
          <Button className="w-full h-12 text-base" onClick={() => startFastMutation.mutate()}>
            <Clock className="h-4 w-4 mr-2" /> Start Fast
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/client/programs")}>
            Start a new protocol
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No protocol or quick plan selected — empty state (but if actively fasting via quick plan, skip to timer)
  if (!hasProtocol && !hasQuickPlan && !isFasting && !hasEatingWindow) {
    // Use per-client image first, then universal trainer fasting card
    const fastingCardBg = fastingCardBgGoldImg;
    const fastingCardMsg = fastingSubtitle || universalFastingCard?.message || "Your fasting journey begins soon.";
    return (
      <Card className="overflow-hidden border-primary/20 shadow-lg relative">
        {fastingCardBg ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${fastingCardBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <CardContent className="relative z-10 min-h-[240px] flex flex-col justify-end p-5 space-y-3">
              <div className="text-left">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1 drop-shadow-lg">
                  {fastingTitle}
                </p>
                <p className="text-base font-bold text-white drop-shadow-lg">
                  {fastingCardMsg}
                </p>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="px-6 py-8 text-center space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {fastingTitle}
              </p>
              <p className="text-base font-bold">
                {fastingCardMsg}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // If protocol is completed (user chose "continue routine"), show maintenance card
  if (featureSettings?.protocol_completed && hasProtocol && !isFasting && !hasEatingWindow) {
    return (
      <Card className="overflow-hidden border-primary/20 shadow-lg">
        <CardContent className="px-5 pt-8 pb-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fasting Program</p>
              <h3 className="text-lg font-black mt-0.5">{planName}</h3>
              {activeKetoType && (
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="h-5 w-auto px-2 rounded-full flex items-center gap-1.5 text-[10px] font-bold"
                    style={{ backgroundColor: `${activeKetoType.color || '#ef4444'}20`, color: activeKetoType.color || '#ef4444' }}
                  >
                    {activeKetoType.abbreviation}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground font-medium">{activeKetoType.name}</span>
                  </div>
                </div>
              )}
            </div>
            <Badge variant="secondary" className="text-xs font-bold px-3 py-1 rounded-full">Complete ✓</Badge>
          </div>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Protocol complete — maintain your routine.</p>
          </div>
          <Button className="w-full h-12 text-base" onClick={() => startFastMutation.mutate()}>
            <Clock className="h-4 w-4 mr-2" /> Start Fast
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/client/programs")}>
            Start a new protocol
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Timer calculations
  if (isFasting && featureSettings.active_fast_start_at && featureSettings.active_fast_target_hours) {

    return (
      <div id="fasting-protocol-card" className="space-y-3">
        {SHOW_WEIGHT_TRACKER && (
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground px-1">KSOM-360 Smart Weight Tracker</h2>
            <SmartPaceBanner allowRender />
          </div>
        )}
        <h2 className="text-lg font-bold text-foreground px-1">KSOM-360 Fasting Timer</h2>
        <Card className="overflow-hidden border-0 shadow-lg relative">
        {/* Lion card background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${fastingCardBgGoldImg})`,
            filter: "sepia(1) saturate(2.5) hue-rotate(-5deg) brightness(0.95)",
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60" />
          <CardContent className="relative z-10 space-y-3 px-4 pt-4 pb-4 text-white sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold text-white/70 uppercase tracking-wider">{isMaintenanceMode ? "Maintenance Schedule" : "Fasting Program"}</p>
                {isCoachAssigned && !isMaintenanceMode && (
                  <Badge className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/20 font-semibold">
                    Coach Assigned
                  </Badge>
                )}
              </div>
              <h3 className="mt-0.5 text-lg font-black leading-tight text-white">{isMaintenanceMode ? (maintenanceLabel || "Maintenance") : planName}</h3>
              {activeKetoType && !isMaintenanceMode && (
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="flex h-5 w-auto items-center gap-1.5 rounded-full px-2 text-[10px] font-bold"
                    style={{ backgroundColor: `${activeKetoType.color || '#ef4444'}20`, color: activeKetoType.color || '#ef4444' }}
                  >
                    {activeKetoType.abbreviation}
                    <span className="text-white/50 font-normal">·</span>
                    <span className="text-white/70 font-medium">{activeKetoType.name}</span>
                  </div>
                </div>
              )}
            </div>
            {hasDuration && !isMaintenanceMode && (
              <Badge variant="secondary" className="shrink-0 rounded-full border-0 bg-white/15 px-3 py-1 text-xs font-bold text-white">
                Day {dayNumber} / {activeProtocol!.duration_days}
              </Badge>
            )}
            {isMaintenanceMode && <Badge variant="secondary" className="text-xs">Maintenance</Badge>}
          </div>

          <div className="flex justify-center overflow-hidden">
              <FastingTimer
                fastStartAt={featureSettings.active_fast_start_at!}
                targetHours={featureSettings.active_fast_target_hours!}
                now={now}
                compact
              />
          </div>


          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowWhatCanIDrink(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors px-4 py-2 text-sm font-semibold text-white border border-white/15 backdrop-blur-sm"
            >
              <Droplet className="h-4 w-4 text-sky-300" />
              What can I drink?
            </button>
          </div>

          <div className="pt-1">
            {featureSettings.fast_lock_pin ? (
              <HoldToEndButton onHoldComplete={() => setShowVerifyPin(true)} />
            ) : (
              <Button variant="destructive" className="w-full h-12 text-base" onClick={() => setShowEndFastEarlySheet(true)}>
                End Fast
              </Button>
            )}
          </div>

          {/* PIN Dialogs */}
          <CreatePinDialog
            open={showCreatePin}
            onPinCreated={async (pin) => {
              await supabase
                .from("client_feature_settings")
                .update({ fast_lock_pin: pin })
                .eq("client_id", clientId);
              queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
              setShowCreatePin(false);
            }}
          />
          <VerifyPinDialog
            open={showVerifyPin}
            onClose={() => setShowVerifyPin(false)}
            storedPin={featureSettings.fast_lock_pin || ""}
            onVerified={() => {
              setShowVerifyPin(false);
              setShowEndFastEarlySheet(true);
            }}
          />

          {/* Coaching intervention before ending the fast early */}
          <EndFastEarlySheet
            open={showEndFastEarlySheet}
            onOpenChange={setShowEndFastEarlySheet}
            clientId={clientId}
            fastStartAt={featureSettings.active_fast_start_at}
            targetHours={featureSettings.active_fast_target_hours!}
            onConfirmEnd={(meta) => endFastMutation.mutate(meta)}
            onCancelMistake={() => {
              const startAt = featureSettings.active_fast_start_at;
              const elapsedH = startAt
                ? Math.max(0, (Date.now() - new Date(startAt).getTime()) / 3_600_000)
                : 0;
              cancelMistakenFastMutation.mutate();
              notifyTrainerFastCancelled("cancel", elapsedH);
            }}
            onEndAndNotifyTrainer={({ elapsedHours }) => {
              endFastMutation.mutate({
                reason: "mistake_reschedule",
                actionAttempted: null,
                note: "Client ended within 15 min of starting and asked trainer to reschedule.",
                aiSuggestionShown: false,
                aiSuggestionText: null,
                elapsedHours,
              });
              notifyTrainerFastCancelled("end_and_notify", elapsedHours);
            }}
            onEndSkipFuel={(meta) => endFastSkipFuelMutation.mutate(meta)}
          />

          <WhatCanIDrinkSheet
            open={showWhatCanIDrink}
            onOpenChange={setShowWhatCanIDrink}
            clientId={clientId}
            activeFastStartAt={featureSettings.active_fast_start_at}
          />
        </CardContent>
        </Card>
        {clientId && <BeveragesTodayCard clientId={clientId} />}
      </div>
    );
  }

  // Eating window active state
  if (hasEatingWindow && featureSettings?.eating_window_ends_at) {
    const ewEnd = new Date(featureSettings.eating_window_ends_at);
    const ewRemainingMs = Math.max(ewEnd.getTime() - now.getTime(), 0);
    const ewH = Math.floor(ewRemainingMs / 3600000);
    const ewM = Math.floor((ewRemainingMs % 3600000) / 60000);
    const ewS = Math.floor((ewRemainingMs % 60000) / 1000);
    const ewTimeStr = `${String(ewH).padStart(2, "0")}:${String(ewM).padStart(2, "0")}:${String(ewS).padStart(2, "0")}`;

    const ewCardImageUrl = featureSettings?.eating_window_card_image_url;
    // Use slideshow photo if available, otherwise fall back to the single card image
    const activeSlideshowPhoto = mealPhotos.length > 0 ? mealPhotos[slideshowIndex] : null;
    const backgroundImage = activeSlideshowPhoto || ewCardImageUrl;
    const hasBackground = !!backgroundImage;

    return (
      <Card
        className="overflow-hidden border shadow-lg"
        style={{ backgroundColor: "hsl(0 0% 4%)", borderColor: "hsl(42 70% 55% / 0.25)" }}
      >
        <div className="relative">
          {/* Editorial Black & Gold — faint gold lion watermark */}
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 m-auto w-[120%] h-[120%] object-contain pointer-events-none"
            style={{
              filter: "sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(1.2)",
              opacity: 0.1,
            }}
          />

          <CardContent
            className="px-5 pt-8 pb-6 space-y-4 relative"
            style={{ color: "hsl(40 20% 92%)" }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.4em]"
                    style={{ color: "hsl(42 70% 55%)" }}
                  >
                    {isMaintenanceMode ? "Maintenance Schedule" : "Fasting Program"}
                  </p>
                  {isCoachAssigned && !isMaintenanceMode && (
                    <Badge
                      className="text-[10px] px-2 py-0.5 font-medium bg-transparent"
                      style={{ borderColor: "hsl(42 70% 55%)", color: "hsl(42 70% 55%)" }}
                    >
                      Coach Assigned
                    </Badge>
                  )}
                </div>
                <h3
                  className="text-2xl font-light tracking-tight mt-1"
                  style={{ fontFamily: "Georgia, serif", color: "hsl(40 20% 92%)" }}
                >
                  {isMaintenanceMode ? (maintenanceLabel || "Maintenance") : planName}
                </h3>
                {activeKetoType && !isMaintenanceMode && (
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="h-5 w-auto px-2 rounded-full flex items-center gap-1.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${activeKetoType.color || '#ef4444'}20`, color: activeKetoType.color || '#ef4444' }}
                    >
                      {activeKetoType.abbreviation}
                      <span style={{ color: "hsl(40 10% 65%)" }}>·</span>
                      <span className="font-medium" style={{ color: "hsl(40 10% 65%)" }}>{activeKetoType.name}</span>
                    </div>
                  </div>
                )}
              </div>
              {hasDuration && !isMaintenanceMode && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium px-3 py-1 rounded-full shrink-0 bg-transparent uppercase tracking-widest"
                  style={{ borderColor: "hsl(42 70% 55%)", color: "hsl(42 70% 55%)" }}
                >
                  Day {dayNumber} / {activeProtocol!.duration_days}
                </Badge>
              )}
              {isMaintenanceMode && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-widest bg-transparent"
                  style={{ borderColor: "hsl(42 70% 55%)", color: "hsl(42 70% 55%)" }}
                >
                  Maintenance
                </Badge>
              )}
            </div>
            <div className="text-center py-6">
              <Badge
                className="mb-3 bg-transparent uppercase tracking-[0.3em] text-[10px] font-medium"
                style={{ borderColor: "hsl(42 70% 55%)", color: "hsl(42 70% 55%)" }}
              >
                Eating Window
              </Badge>
              <p
                className="text-5xl font-light tabular-nums tracking-tight"
                style={{ fontFamily: "Georgia, serif", color: "hsl(40 20% 92%)" }}
              >
                {ewTimeStr}
              </p>
              <p className="text-sm mt-2" style={{ color: "hsl(40 10% 65%)" }}>
                Closes in {ewH}h {ewM}m
              </p>
              <p
                className="text-xs font-medium mt-2 uppercase tracking-[0.3em]"
                style={{ color: "hsl(42 70% 55%)" }}
              >
                Meals are available
              </p>
              <div className="flex justify-center gap-3 mt-2">
                {featureSettings?.last_fast_ended_at && (
                  <span
                    className="text-[11px] px-3 py-1.5 rounded-sm border bg-transparent"
                    style={{ borderColor: "hsl(42 70% 55% / 0.4)", color: "hsl(40 10% 65%)" }}
                  >
                    Fast ended: {format(new Date(featureSettings.last_fast_ended_at), "MMM d, h:mm a")}
                  </span>
                )}
                <span
                  className="text-[11px] px-3 py-1.5 rounded-sm border bg-transparent"
                  style={{ borderColor: "hsl(42 70% 55% / 0.4)", color: "hsl(40 10% 65%)" }}
                >
                  Window closes: {format(ewEnd, "MMM d, h:mm a")}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {ewRemainingMs > 0 && (
                <Button
                  variant="ghost"
                  className="w-full h-12 text-sm font-medium uppercase tracking-widest bg-transparent border hover:bg-transparent"
                  style={{ borderColor: "hsl(42 70% 55%)", color: "hsl(42 70% 55%)" }}
                  onClick={() => {
                    setEatingWindowSheetIntent("end_window");
                    setShowEndEatingWindowSheet(true);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" /> End Eating Window
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full h-12 text-sm font-medium uppercase tracking-widest bg-transparent border hover:bg-transparent"
                style={{ borderColor: "hsl(42 70% 55% / 0.5)", color: "hsl(40 20% 92%)" }}
                onClick={() => {
                  if (ewRemainingMs > 0) {
                    setEatingWindowSheetIntent("choose_next_fast");
                    setShowEndEatingWindowSheet(true);
                  } else {
                    navigate("/client/begin-reset");
                  }
                }}
              >
                <Clock className="h-4 w-4 mr-2" /> Choose next fast
              </Button>
            </div>
          </CardContent>
        </div>

        <EndEatingWindowEarlySheet
          open={showEndEatingWindowSheet}
          onOpenChange={setShowEndEatingWindowSheet}
          remainingMs={ewRemainingMs}
          windowHours={featureSettings?.eating_window_hours || 8}
          elapsedMs={Math.max(
            0,
            (featureSettings?.eating_window_hours || 8) * 3_600_000 - ewRemainingMs,
          )}
          intent={eatingWindowSheetIntent}
          onConfirm={async (meta) => {
            if (!clientId) return;
            const targetH = featureSettings?.eating_window_hours || 8;
            const completionPct = targetH > 0
              ? Math.min(Math.round((meta.elapsedHours / targetH) * 100), 100)
              : 0;
            // Log early-end metadata
            try {
              await supabase.from("early_session_ends").insert({
                client_id: clientId,
                session_type: "eating_window",
                elapsed_hours: meta.elapsedHours,
                target_hours: targetH,
                percent_complete: completionPct,
                reason: meta.reason,
                action_attempted: null,
                ai_suggestion_shown: false,
                ai_suggestion_text: null,
                note: meta.note || null,
              });
            } catch (e) {
              console.warn("early_session_ends insert (eating_window) failed:", e);
            }

            if (eatingWindowSheetIntent === "choose_next_fast") {
              navigate("/client/begin-reset");
            } else {
              await supabase
                .from("client_feature_settings")
                .update({ eating_window_ends_at: null })
                .eq("client_id", clientId);
              queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting", clientId] });
              queryClient.invalidateQueries({ queryKey: ["my-feature-settings", clientId] });
              queryClient.invalidateQueries({ queryKey: ["fasting-profile-data"] });
              navigate("/client/dashboard");
            }
          }}
        />
      </Card>
    );
  }

  // Not fasting — ready state
  // Gold lion is the universal default background for the premium
  // "Quiet Luxury" Fasting Protocol card per design spec.
  const fastingCardBg = fastingCardBgGoldImg;
  const ketoAccent = activeKetoType?.color || '#ef4444';

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-lg relative">
        {/* Hybrid background: photo + animated keto color wash */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${fastingCardBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/40" />
        <div
          className="absolute -inset-10 animate-[pulse_5s_ease-in-out_infinite] pointer-events-none"
          style={{
            background: `radial-gradient(60% 50% at 80% 20%, ${ketoAccent}55, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
        />

        <CardContent className={`relative z-10 px-5 pt-7 pb-6 space-y-5 text-white ${!programFullyAssigned ? "min-h-[420px] flex flex-col justify-end" : ""}`}>
          {/* Quiet Luxury header — only when BOTH protocol + keto type are assigned */}
          {programFullyAssigned && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-white/50 uppercase tracking-[0.25em]">
                {isMaintenanceMode ? "Maintenance Schedule" : "Fasting Protocol"}
              </p>
              <h3 className="text-3xl font-light text-white tracking-tight mt-1 truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {isMaintenanceMode ? (maintenanceLabel || "Maintenance") : planName}
              </h3>
              {activeKetoType && !isMaintenanceMode && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="font-bold" style={{ color: ketoAccent }}>{activeKetoType.abbreviation}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/70 truncate">{activeKetoType.name}</span>
                </div>
              )}
              {isCoachAssigned && !isMaintenanceMode && (
                <Badge className="mt-2 text-[10px] px-2 py-0.5 bg-amber-400/15 text-amber-300 border border-amber-300/40 hover:bg-amber-400/15 font-semibold uppercase tracking-wider">
                  Coach Assigned
                </Badge>
              )}
            </div>
            {hasDuration && !isMaintenanceMode && (
              <div className="text-right shrink-0">
                <p className="text-[9px] uppercase tracking-wider text-white/40 font-medium">Day</p>
                <p className="text-lg font-light text-white tabular-nums">
                  {dayNumber}<span className="text-white/40">/{activeProtocol!.duration_days}</span>
                </p>
              </div>
            )}
            {isMaintenanceMode && <Badge variant="outline" className="text-xs border-white/30 text-white bg-white/10 shrink-0">Maintenance</Badge>}
          </div>
          )}

          {/* Single accent line in keto color — only when fully assigned */}
          {programFullyAssigned && (
            <div
              className="h-px w-full"
              style={{ background: `linear-gradient(90deg, transparent, ${ketoAccent}80, transparent)` }}
            />
          )}

          {/* Day progress sub-card */}
          {hasDuration && !isMaintenanceMode && dayNumber >= activeProtocol!.duration_days ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 border border-white/10">
              <div className="text-center">
                <span className="text-2xl font-black text-white">{dayNumber}</span>
                <span className="text-sm text-white/60">/{activeProtocol!.duration_days}</span>
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Day</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Protocol</p>
                <p className="text-sm font-bold text-white">Protocol Complete!</p>
              </div>
            </div>
          ) : null}

          {/* Stats row — 4 tiles. Only when BOTH protocol + keto type are assigned */}
          {programFullyAssigned && (hasProtocol || hasQuickPlan) && !isMaintenanceMode && (() => {
            const fastHours = activeProtocol?.fast_target_hours || activeQuickPlan?.fast_hours || 16;
            const diffLevel = activeProtocol?.difficulty_level || activeQuickPlan?.intensity_tier || "beginner";
            const totalDays = activeProtocol?.duration_days;
            // Always show Day tile in 4-tile layout. Quick plans (no totalDays)
            // show "—" for total days but still render the tile so the
            // premium 4-tile layout stays consistent.
            const showDayTile = true;
            return (
              <div className="grid grid-cols-4 gap-2">
                {/* Fast tile */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center border border-white/15 min-w-0">
                  <Clock className="h-4 w-4 mx-auto text-white/60 mb-1" />
                  <p className="text-sm font-black text-white leading-tight tabular-nums">{todayFastLog ? `${Math.round(todayFastLog.actual_hours)}h` : `${fastHours}h`}</p>
                  <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">{todayFastLog ? "Fasted" : "Fast"}</p>
                </div>
                {/* Keto macro tile */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center border border-white/15 min-w-0 flex flex-col items-center justify-center">
                  {activeKetoType ? (
                    <>
                      <p
                        className="text-[10px] font-black leading-tight text-center w-full"
                        style={{ color: ketoAccent, textShadow: `0 0 8px ${ketoAccent}80` }}
                      >
                        {activeKetoType.abbreviation}
                      </p>
                      <p className="text-[11px] font-black text-white leading-tight mt-0.5 tabular-nums text-center">
                        {activeKetoType.fat_pct}/{activeKetoType.protein_pct}/{activeKetoType.carbs_pct}
                      </p>
                      <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5 text-center">F/P/C</p>
                    </>
                  ) : (
                    <>
                      <CalendarDays className="h-4 w-4 mx-auto text-white/60 mb-1" />
                      <p className="text-sm font-black text-white leading-tight">--</p>
                      <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Macros</p>
                    </>
                  )}
                </div>
                {/* Day tile — always present in 4-tile layout */}
                {showDayTile && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center border border-white/15 min-w-0">
                    <CalendarDays className="h-4 w-4 mx-auto text-white/60 mb-1" />
                    <p className="text-sm font-black text-white leading-tight tabular-nums">
                      {totalDays ? `${dayNumber}/${totalDays}` : `${dayNumber}`}
                    </p>
                    <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Day</p>
                  </div>
                )}
                {/* Level tile */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center border border-white/15 min-w-0 overflow-hidden">
                  <BarChart3 className="h-4 w-4 mx-auto text-white/60 mb-1" />
                  <p className="text-[11px] font-black text-white leading-tight truncate">{getDifficultyLabel(diffLevel)}</p>
                  <p className="text-[9px] text-white/60 uppercase tracking-wider font-medium mt-0.5">Level</p>
                </div>
              </div>
            );
          })()}

          {/* "View Your Assigned Program" — only when BOTH halves are assigned */}
          {programFullyAssigned && (
            <Button
              variant="ghost"
              className="w-full h-11 text-sm font-medium gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md"
              onClick={() => navigate("/client/complete-plan")}
            >
              View Your Assigned Program
            </Button>
          )}

          {/* Gold pills — View Protocol + View Keto Type. Always present.
              If admin has an assignment, they deep-link to the assigned detail page
              (with big-numbers gold lion layout). Otherwise they open the browse
              library where every card is locked except the assigned one. */}
          {(() => {
            const isLocked = !!featureSettings?.lock_client_plan_choice;
            // Always open the full library so the client sees every card
            // (assigned card highlighted, others locked when admin enforces it).
            const protocolHref = "/client/fasting-plans-preview";
            const ketoHref = activeKetoType?.id
              ? `/client/keto-types/${activeKetoType.id}`
              : "/client/keto-types";

            const PillButton = ({
              label,
              onClick,
            }: {
              label: string;
              onClick: () => void;
            }) => (
              <button
                type="button"
                onClick={onClick}
                className="flex-1 h-8 rounded-full px-3 inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-black shadow-[0_1px_6px_-1px_rgba(251,191,36,0.5)] ring-1 ring-amber-300/70 hover:brightness-110 active:scale-[0.98] transition"
              >
                {isLocked && <Shield className="h-3 w-3" />}
                {label}
              </button>
            );

            return (
              <div className="space-y-2">
                {isLocked && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                    <Shield className="h-3 w-3" />
                    Locked by your coach
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <PillButton label="View Protocol" onClick={() => navigate(protocolHref)} />
                  <PillButton label="View Keto Type" onClick={() => navigate(ketoHref)} />
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Protocol Completion Dialog */}
      {hasProtocol && hasDuration && (
        <ProtocolCompletionDialog
          open={showCompletion}
          onOpenChange={setShowCompletion}
          protocolName={planName}
          durationDays={activeProtocol!.duration_days}
          onContinueRoutine={() => continueRoutineMutation.mutate()}
          onSwitchToMaintenance={() => switchToMaintenanceMutation.mutate()}
        />
      )}
    </>
  );
}

export default function ClientDashboard() {
  const { isImpersonating } = useImpersonation();

  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pace } = useSmartPace();
  const { settings, isLoading: settingsLoading } = useClientFeatureSettings();
  const { config: engineConfig } = useEngineMode();
  const { toast } = useToast();
  const [openEndFastFlowSignal, setOpenEndFastFlowSignal] = useState(0);
  const { cards: layoutCards, isLoading: layoutLoading } = useDashboardLayoutClient();
  const { data: streakData } = useConsistencyStreak();

  // Unread messages count for floating lion badge
  // Use clientId (effectiveClientId) so it works correctly when trainer is previewing as a client
  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-badge", clientId],
    queryFn: async () => {
      if (!clientId) return 0;
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", clientId);
      if (!memberships?.length) return 0;
      const convoIds = memberships.map((m) => m.conversation_id);
      const { data: readReceipts } = await supabase
        .from("conversation_read_receipts")
        .select("conversation_id, last_read_at")
        .eq("user_id", clientId)
        .in("conversation_id", convoIds);
      const readMap = new Map(readReceipts?.map((r) => [r.conversation_id, r.last_read_at]) || []);
      const { data: messages } = await supabase
        .from("conversation_messages")
        .select("conversation_id, created_at, sender_id")
        .in("conversation_id", convoIds)
        .neq("sender_id", clientId);
      if (!messages?.length) return 0;
      let total = 0;
      for (const msg of messages) {
        const lastRead = readMap.get(msg.conversation_id);
        if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) total++;
      }
      return total;
    },
    enabled: !!clientId,
    refetchInterval: 15_000,
  });

  const DIET_STYLES = [
    { value: "standard_keto", label: "Standard Keto", split: "75F / 20P / 5C", icon: "🥑", fatPct: 0.75, proteinPct: 0.20, carbsPct: 0.05 },
    { value: "high_protein_keto", label: "High Protein Keto", split: "60F / 35P / 5C", icon: "💪", fatPct: 0.60, proteinPct: 0.35, carbsPct: 0.05 },
    { value: "modified_keto", label: "Modified Keto", split: "70F / 25P / 5C", icon: "⚖️", fatPct: 0.70, proteinPct: 0.25, carbsPct: 0.05 },
  ];

  // Quick-edit macro sheet state

  const [macroEditOpen, setMacroEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"grams" | "percent">("grams");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFats, setCustomFats] = useState("");

  // Carousel state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Install banner state
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (isStandalone) return false;
    const dismissed = localStorage.getItem('installBannerDismissed');
    if (dismissed) {
      const days3 = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissed, 10) < days3) return false;
    }
    return true;
  });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('installBannerDismissed', Date.now().toString());
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(index);
  }, []);

  // Check if profile is complete, redirect to onboarding if not
  // Skip this check when a trainer is impersonating/previewing a client
  const { data: profile } = useQuery({
    queryKey: ["profile-check", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, onboarding_completed")
        .eq("id", clientId)
        .single();

      if (!data?.onboarding_completed && !isImpersonating) {
        navigate("/client/onboarding");
      }
      
      return data;
    },
    enabled: !!clientId,
  });

  // Fetch today's assigned workouts
  const { data: clientWorkouts } = useQuery({
    queryKey: ["client-workouts-today", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workouts")
        .select(`*, workout_plan:workout_plans(*)`)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  const { data: todayTrackedAssignedSessions } = useQuery({
    queryKey: ["today-tracked-assigned-sessions", clientId],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, client_workout_id, workout_plan_id, completed_at, is_partial, status, completion_percentage, workout_plan:workout_plans(*)")
        .eq("client_id", clientId)
        .or(`completed_at.gte.${startOfDay.toISOString()},created_at.gte.${startOfDay.toISOString()},status.eq.in_progress`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  // Fetch today's tasks
  const { data: tasks } = useQuery({
    queryKey: ["client-tasks-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", clientId)
        .or(`due_date.eq.${today},due_date.is.null`)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Fetch today's habits
  const { data: habits } = useQuery({
    queryKey: ["client-habits-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("client_habits")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .lte("start_date", today);
      if (error) throw error;
      return (data as any[]).filter((h: any) => {
        if (h.end_date && h.end_date < today) return false;
        if (h.frequency === "daily") return true;
        const startDay = new Date(h.start_date + "T00:00:00").getDay();
        return new Date().getDay() === startDay;
      });
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  // Fetch today's habit completions
  const { data: habitCompletions } = useQuery({
    queryKey: ["client-habit-completions-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("client_id", clientId)
        .eq("completion_date", today);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && settings.tasks_enabled,
  });

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, completed }: { habitId: string; completed: boolean }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      if (completed) {
        const { error } = await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", habitId)
          .eq("client_id", clientId)
          .eq("completion_date", today);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_completions")
          .insert({ habit_id: habitId, client_id: clientId!, completion_date: today });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-habit-completions-today"] });
    },
  });

  // Fetch nutrition logs for today
  const { data: todayNutrition } = useQuery({
    queryKey: ["nutrition-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .eq("log_date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.food_journal_enabled,
  });

  // Fetch fasting state for meal gating
  const { data: fastingState } = useQuery({
    queryKey: ["fasting-gate-state", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feature_settings")
        .select("selected_protocol_id, active_fast_start_at, active_fast_target_hours, fasting_strict_mode, eating_window_ends_at, eating_window_hours, protocol_start_date, maintenance_mode, maintenance_schedule_type, trainer_id, last_fast_ended_at")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        selected_protocol_id: string | null;
        active_fast_start_at: string | null;
        active_fast_target_hours: number | null;
        fasting_strict_mode: boolean;
        eating_window_ends_at: string | null;
        eating_window_hours: number;
        protocol_start_date: string | null;
        maintenance_mode: boolean;
        maintenance_schedule_type: string | null;
        trainer_id: string;
        last_fast_ended_at: string | null;
      } | null;
    },
    enabled: !!clientId && settings.fasting_enabled,
  });

  // Fetch protocol duration for coach tip milestone messages
  const { data: coachTipProtocol } = useQuery({
    queryKey: ["coach-tip-protocol", fastingState?.selected_protocol_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("duration_days")
        .eq("id", fastingState!.selected_protocol_id!)
        .single();
      if (error) throw error;
      return data as { duration_days: number };
    },
    enabled: !!fastingState?.selected_protocol_id && settings.fasting_enabled,
  });

  // Determine meal gating status
  const mealGateStatus = (() => {
    if (!settings.fasting_enabled) return "allowed"; // no gating
    if (!fastingState?.selected_protocol_id) return "no_protocol";
    if (fastingState.active_fast_start_at) return "fasting";
    // Not fasting — check strict mode
    if (fastingState.fasting_strict_mode) {
      // In strict mode, meals only during eating window
      if (fastingState.eating_window_ends_at && new Date(fastingState.eating_window_ends_at) > new Date()) {
        return "allowed";
      }
      return "strict_locked"; // no eating window active
    }
    return "allowed";
  })();


  // Fasting status for the standalone card in tracking section
  const { data: dashRecentFastLog } = useQuery({
    queryKey: ["recent-fasting-log-dash", clientId, fastingState?.last_fast_ended_at],
    queryFn: async () => {
      if (!clientId || !fastingState?.last_fast_ended_at) return null;

      const { data, error } = await supabase
        .from("fasting_log" as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("ended_at", fastingState.last_fast_ended_at)
        .maybeSingle();

      if (error || !data) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("fasting_log" as any)
          .select("*")
          .eq("client_id", clientId)
          .not("ended_at", "is", null)
          .order("ended_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackError || !fallbackData) return null;
        const fallback = fallbackData as any;
        return {
          actual_hours: fallback.actual_hours ?? 0,
          target_hours: fallback.target_hours ?? 0,
          completion_pct: fallback.completion_pct ?? 0,
          ended_early: fallback.ended_early ?? false,
        };
      }

      const d = data as any;
      return {
        actual_hours: d.actual_hours ?? 0,
        target_hours: d.target_hours ?? 0,
        completion_pct: d.completion_pct ?? 0,
        ended_early: d.ended_early ?? false,
      };
    },
    enabled: !!clientId && !!fastingState?.last_fast_ended_at,
  });

  const fastEndTimeStr = (() => {
    if (mealGateStatus !== "fasting" || !fastingState?.active_fast_start_at || !fastingState?.active_fast_target_hours) return "";
    const end = new Date(new Date(fastingState.active_fast_start_at).getTime() + fastingState.active_fast_target_hours * 3600000);
    return end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  })();

  // Fetch macro targets
  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", clientId!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.macros_enabled,
  });

  // Realtime: auto-refresh macros when trainer syncs from keto macro editor
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel("dashboard-macro-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "client_macro_targets", filter: `client_id=eq.${clientId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["client-macro-targets", clientId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, queryClient]);


  // Quick macro edit mutation
  const saveMacrosMutation = useMutation({
    mutationFn: async (payload: { calories: number; protein: number; carbs: number; fats: number; diet_style: string }) => {
      const isImpersonating = clientId !== user?.id;
      const updateData = {
        target_calories: payload.calories,
        target_protein: payload.protein,
        target_carbs: payload.carbs,
        target_fats: payload.fats,
        diet_style: payload.diet_style,
        ...(isImpersonating ? { trainer_id: user?.id } : {}),
      };
      if (macroTargets) {
        const { error } = await supabase.from("client_macro_targets").update(updateData).eq("id", macroTargets.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-macro-targets"] });
      setMacroEditOpen(false);
      toast({ title: "Macro goals updated!" });
    },
  });

  const handleDietPresetSelect = (preset: typeof DIET_STYLES[0]) => {
    const cals = macroTargets?.target_calories || 2000;
    const protein = Math.round((cals * preset.proteinPct) / 4);
    const carbs = Math.round((cals * preset.carbsPct) / 4);
    const fats = Math.round((cals * preset.fatPct) / 9);
    saveMacrosMutation.mutate({ calories: cals, protein, carbs, fats, diet_style: preset.value });
  };

  const handleCustomSave = () => {
    const cals = parseInt(customCalories) || macroTargets?.target_calories || 2000;
    if (editMode === "percent") {
      const pPct = parseFloat(customProtein) || 0;
      const cPct = parseFloat(customCarbs) || 0;
      const fPct = parseFloat(customFats) || 0;
      saveMacrosMutation.mutate({
        calories: cals,
        protein: Math.round((cals * pPct / 100) / 4),
        carbs: Math.round((cals * cPct / 100) / 4),
        fats: Math.round((cals * fPct / 100) / 9),
        diet_style: "custom",
      });
    } else {
      saveMacrosMutation.mutate({
        calories: cals,
        protein: parseInt(customProtein) || 0,
        carbs: parseInt(customCarbs) || 0,
        fats: parseInt(customFats) || 0,
        diet_style: "custom",
      });
    }
  };

  const openMacroEdit = () => {
    if (macroTargets) {
      setCustomCalories(String(macroTargets.target_calories || ""));
      setCustomProtein(String(Math.round(Number(macroTargets.target_protein) || 0)));
      setCustomCarbs(String(Math.round(Number(macroTargets.target_carbs) || 0)));
      setCustomFats(String(Math.round(Number(macroTargets.target_fats) || 0)));
      setEditMode("grams");
    }
    setMacroEditOpen(true);
  };

  const getDietLabel = () => {
    const style = (macroTargets as any)?.diet_style;
    const found = DIET_STYLES.find(d => d.value === style);
    if (found) return found.label;
    if (style === "custom") return "Custom";
    // Infer from current macro ratios if diet_style not yet saved
    if (macroTargets && macroTargets.target_calories) {
      const cals = macroTargets.target_calories;
      const pPct = Math.round(((Number(macroTargets.target_protein) || 0) * 4 / cals) * 100);
      const fPct = Math.round(((Number(macroTargets.target_fats) || 0) * 9 / cals) * 100);
      for (const d of DIET_STYLES) {
        if (Math.abs(pPct - d.proteinPct * 100) <= 3 && Math.abs(fPct - d.fatPct * 100) <= 3) {
          return d.label;
        }
      }
      return "Custom";
    }
    return null;
  };

  // Complete task mutation
  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks-today"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("client_tasks")
        .delete()
        .eq("id", taskId)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks-today"] });
      toast({ title: "Task deleted" });
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const todayDate = format(new Date(), "EEEE, MMM d").toUpperCase();

  // Fetch custom rest day card
  const { data: restDayCard } = useQuery({
    queryKey: ["rest-day-card", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_rest_day_cards" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId && settings.training_enabled,
  });

  // Fetch trainer's welcome card for new clients with no plan
  const { data: welcomeCard } = useQuery({
    queryKey: ["trainer-welcome-card-client", clientId],
    queryFn: async () => {
      // Get trainer_id from client_feature_settings
      const { data: cfs } = await supabase
        .from("client_feature_settings")
        .select("trainer_id")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (!cfs?.trainer_id) return null;
      const { data, error } = await supabase
        .from("trainer_welcome_cards")
        .select("*")
        .eq("trainer_id", cfs.trainer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && settings.training_enabled,
  });


  const { data: todaySportEvents } = useQuery({
    queryKey: ["client-sport-events-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("sport_schedule_events")
        .select("*")
        .eq("client_id", clientId)
        .gte("start_time", `${today}T00:00:00`)
        .lte("start_time", `${today}T23:59:59`)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId && settings.sport_schedule_enabled !== false,
  });

  // Fetch custom sport day cards (practice/game)
  const { data: sportDayCards } = useQuery({
    queryKey: ["sport-day-cards", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sport_day_cards" as any)
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  const practiceCard = sportDayCards?.find((c: any) => c.card_type === "practice");
  const gameCard = sportDayCards?.find((c: any) => c.card_type === "game");

  // Sport event completion dialog state
  const [selectedSportEvent, setSelectedSportEvent] = useState<any>(null);
  const [sportCompletionOpen, setSportCompletionOpen] = useState(false);
  const [cardioFlowOpen, setCardioFlowOpen] = useState(false);
  const [wodSheetOpen, setWodSheetOpen] = useState(false);
  const [selectedCardioSession, setSelectedCardioSession] = useState<any>(null);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);

  // When a non-today date is selected in the calendar strip, hide today's dashboard cards
  const isViewingOtherDay = !!(calendarSelectedDate && !isToday(calendarSelectedDate));

  const { data: sportEventCompletions } = useQuery({
    queryKey: ["sport-event-completions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sport_event_completions" as any)
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  // Fetch today's cardio sessions (in-progress, completed today, OR scheduled for today)
  const { data: todayCardioSessions } = useQuery({
    queryKey: ["cardio-sessions-today", clientId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("cardio_sessions" as any)
        .select("*")
        .eq("client_id", clientId)
        .or(`created_at.gte.${today}T00:00:00,completed_at.gte.${today}T00:00:00,status.eq.in_progress,and(status.eq.scheduled,scheduled_date.eq.${today})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!clientId,
  });

  function formatEventTime(isoString: string): string {
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hours = parseInt(match[1], 10);
    const displayHour = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${displayHour}:${match[2]} ${ampm}`;
  }

  const formatCardioTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const openCardioSession = useCallback((session: {
    id: string;
    activity_type: string;
    target_type: string | null;
    target_value: number | null;
  }) => {
    const params = new URLSearchParams({
      activity: session.activity_type,
      targetType: session.target_type || "none",
      sessionId: session.id,
    });

    if (session.target_value !== null && session.target_value !== undefined) {
      params.set("targetValue", String(session.target_value));
    }

    navigate(`/client/cardio-player?${params.toString()}`);
  }, [navigate]);

  const handleCardioStart = async (activity: string, targetType: string, targetValue?: number) => {
    if (!clientId) return;

    const { data: existingSession, error: existingSessionError } = await supabase
      .from("cardio_sessions" as any)
      .select("id, activity_type, target_type, target_value")
      .eq("client_id", clientId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSessionError) {
      toast({ title: "Error", variant: "destructive" });
      return;
    }

    if (existingSession) {
      toast({ title: "Resuming your active cardio session" });
      openCardioSession(existingSession as any);
      return;
    }

    const { data, error } = await supabase
      .from("cardio_sessions" as any)
      .insert({
        client_id: clientId,
        activity_type: activity,
        target_type: targetType,
        target_value: targetValue || null,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id, activity_type, target_type, target_value")
      .single();
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    openCardioSession(data as any);
  };

  const handleCardioComplete = async (activity: string, targetType: string, targetValue?: number) => {
    if (!clientId) return;
    await supabase
      .from("cardio_sessions" as any)
      .insert({
        client_id: clientId,
        activity_type: activity,
        target_type: targetType,
        target_value: targetValue || null,
        status: "completed",
        duration_seconds: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    queryClient.invalidateQueries({ queryKey: ["cardio-sessions-today"] });
    toast({ title: "Activity logged!", description: `${activity} marked as complete` });
  };

  // Today's workouts
  const todaysWorkouts = clientWorkouts?.filter((w) => {
    if (w.completed_at) return false;
    if (w.scheduled_date && isToday(parseISO(w.scheduled_date))) return true;
    return false;
  }) || [];

  // Today's scheduled cardio (not yet started)
  const todaysScheduledCardio = (todayCardioSessions || []).filter((s: any) => {
    if (s.status !== "scheduled") return false;
    if (!s.scheduled_date) return false;
    return isToday(parseISO(s.scheduled_date));
  });

  const hasSportEvents = (todaySportEvents?.length || 0) > 0;
  const hasNoPlanEver = !clientWorkouts || clientWorkouts.length === 0;
  const isRestDay = todaysWorkouts.length === 0 && !hasSportEvents && todaysScheduledCardio.length === 0;
  // Show the trainer's universal Welcome Card on any rest day for clients
  // without a custom rest-day card. Falls back to defaults so it appears
  // for every new client even before the trainer customizes it.
  const showWelcomeCard = isRestDay && !restDayCard?.image_url && !restDayCard?.message;
  const totalCards = todaysWorkouts.length + (todaySportEvents?.length || 0) + todaysScheduledCardio.length;
  const hasMultiple = totalCards > 1;

  // Attach scroll listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasMultiple) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, hasMultiple]);

  // Task stats
  const completedTaskCount = tasks?.filter((t) => t.completed_at)?.length || 0;
  const totalTaskCount = tasks?.length || 0;

  // Nutrition stats
  const nutritionArray = Array.isArray(todayNutrition) ? todayNutrition : [];
  const todayMealCount = nutritionArray.length;
  const todayCalories = nutritionArray.reduce((sum, log) => sum + (log.calories || 0), 0);
  const todayProtein = nutritionArray.reduce((sum, log) => sum + (log.protein || 0), 0);
  const todayCarbs = nutritionArray.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const todayFats = nutritionArray.reduce((sum, log) => sum + (log.fats || 0), 0);


  // Wait for settings + layout before rendering — prevents the dashboard from
  // briefly flashing default cards (which the saved layout may hide) on refresh.
  if (settingsLoading || layoutLoading) {
    return (
      <ClientLayout>
        <div className="px-3 pt-4 pb-8 space-y-4 w-full">
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-5 w-full">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider">{todayDate}</p>
            <h1 className="text-2xl font-bold mt-0.5">Hello, {firstName}! {settings.greeting_emoji || '👋'}</h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">{settings.greeting_subtitle || 'Let\'s do this'}</p>
          </div>
          <div className="flex items-center gap-2">
            {streakData && streakData.currentStreak > 0 && (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${streakData.tierInfo.bgColor} ${streakData.tierInfo.color}`}
                style={{ borderColor: `${streakData.tierInfo.pillColor}30` }}
              >
                <span>{streakData.tierInfo.emoji}</span>
                <span>{streakData.currentStreak}🔥</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/client/settings")}>
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Sport Hero Banner — always at top when sport_schedule_enabled */}
        {settings.sport_schedule_enabled && clientId && (
          <SportHeroBanner clientId={clientId} firstName={firstName} />
        )}

        {/* Dashboard Hero Message */}
        {settings.dashboard_hero_message && (
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardContent className="px-5 py-4">
              <p className="text-sm font-medium text-foreground">{settings.dashboard_hero_message}</p>
            </CardContent>
          </Card>
        )}

        {/* In-App Notifications — surfaced above the weight tracker so coaching alerts get seen first */}
        <InAppNotifications />

        <SmartPaceCatchUpModal />

        {/* Today's Coaching */}
        <CoachingCard />

        {/* Daily Score Ring — hidden temporarily, looking for new placement */}
        {/* <DailyScoreRing /> */}

        {/* Workout Tracker — only shows when there are completed sessions */}
        {(() => {
          const completedCardio = todayCardioSessions?.filter((s: any) => s.status === "completed") || [];
          const completedCustomSessions = (todayTrackedAssignedSessions || []).filter((session: any) =>
            !session.client_workout_id && (session.completed_at || session.status === "completed" || session.status === "partial")
          );
          const completedAssignedFromRow = clientWorkouts?.filter((w: any) => w.completed_at && w.scheduled_date && isToday(parseISO(w.scheduled_date))) || [];
          const completedAssignedFromSessions = (todayTrackedAssignedSessions || []).filter((session: any) =>
            session.client_workout_id && !completedAssignedFromRow.some((workout: any) => workout.id === session.client_workout_id)
          );
          const completedAssigned = [...completedAssignedFromRow, ...completedAssignedFromSessions];
          const allCompleted = [...completedAssigned, ...completedCardio, ...completedCustomSessions];
          if (allCompleted.length === 0) return null;

          return (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Workout Tracker</h2>

               {/* Quick Workouts — assigned and cardio sessions */}
              {(completedAssigned.length > 0 || completedCardio.length > 0) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Workouts</h3>
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {completedAssigned.map((workout: any) => {
                        const clientWorkoutId = workout.client_workout_id ?? workout.id;
                        const matchedSession = workout.client_workout_id
                          ? workout
                          : (todayTrackedAssignedSessions || []).find((s: any) => s.client_workout_id === workout.id);
                        const sessionId = matchedSession?.id;
                        const isInProgressW = workout.status === "in_progress";
                        return (
                          <SwipeToDeleteWorkoutRow
                            key={workout.id}
                            workout={workout}
                            onDelete={async () => {
                              try {
                                if (sessionId) {
                                  await supabase.from("workout_sessions").delete().eq("id", sessionId);
                                }
                                await supabase.from("client_workouts").update({ completed_at: null }).eq("id", clientWorkoutId);
                                queryClient.invalidateQueries({ queryKey: ["today-tracked-assigned-sessions", clientId] });
                                queryClient.invalidateQueries({ queryKey: ["client-workouts"] });
                                toast({ title: "Workout unmarked" });
                              } catch (error) {
                                toast({ title: "Couldn't undo workout", variant: "destructive" });
                              }
                            }}
                            onClick={() => {
                              if (isInProgressW) {
                                navigate(`/client/workouts/${workout.workout_plan_id}`);
                              } else if (sessionId) {
                                navigate(`/client/workout-session/${sessionId}`);
                              } else {
                                navigate(`/client/workouts/${workout.workout_plan_id}`);
                              }
                            }}
                          />
                        );
                      })}
                      {completedCardio.map((session: any) => (
                        <SwipeToDeleteCardioRow
                          key={session.id}
                          session={session}
                          onDelete={async () => {
                            await supabase.from("cardio_sessions" as any).delete().eq("id", session.id);
                            queryClient.invalidateQueries({ queryKey: ["cardio-sessions-today"] });
                            toast({ title: "Activity deleted" });
                          }}
                          onClick={() => setSelectedCardioSession(session)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Custom Workouts by User */}
              {completedCustomSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Custom Workouts by {firstName || "You"}
                  </h3>
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {completedCustomSessions.map((session: any) => (
                        <SwipeToDeleteWorkoutRow
                          key={session.id}
                          workout={{
                            ...session,
                            workout_plan_id: session.workout_plan_id,
                            workout_plan: session.workout_plan,
                          }}
                          onDelete={async () => {
                            try {
                              await supabase.from("workout_sessions").delete().eq("id", session.id);
                              queryClient.invalidateQueries({ queryKey: ["today-tracked-assigned-sessions", clientId] });
                              toast({ title: "Workout deleted" });
                            } catch (error) {
                              toast({ title: "Couldn't delete workout", variant: "destructive" });
                            }
                          }}
                          onClick={() => navigate(`/client/workout-session/${session.id}`)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          );
        })()}

        {/* Meal Decision Card — eating window only */}
        <MealDecisionCard />

        {/* Layout-driven card rendering */}
        {layoutCards.filter(c => c.visible).map((card) => {
          switch (card.key) {
            case "calendar":
              return settings.calendar_days_ahead > 0 && clientId ? (
                <div key="calendar" className="space-y-2">
                  <DayStripCalendar
                    clientId={clientId}
                    daysAhead={settings.calendar_days_ahead}
                    trainingEnabled={settings.training_enabled}
                    tasksEnabled={settings.tasks_enabled}
                    onDateChange={setCalendarSelectedDate}
                  />
                </div>
              ) : null;

            case "workouts":
              return settings.training_enabled && !isViewingOtherDay ? (
                <div key="workouts">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {isRestDay ? "Today" : hasSportEvents && todaysWorkouts.length === 0 ? "Today's Schedule" : `Today's Workout${hasMultiple ? "s" : ""}`}
                  </h2>
                  {isRestDay ? (
                    showWelcomeCard ? (
                      <WelcomeCard
                        imageUrl={welcomeCard?.image_url}
                        message={welcomeCard?.message || "Welcome to your fitness journey!"}
                        title={(welcomeCard as any)?.title || "KSOM-360"}
                      />
                    ) : (
                    <Card className="overflow-hidden">
                      {restDayCard?.image_url ? (
                        <div className="relative h-56">
                          <img src={restDayCard.image_url} alt="Rest day" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            {restDayCard?.title && (
                              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{restDayCard.title}</p>
                            )}
                            {restDayCard?.message && (
                              <p className="text-base font-bold text-white">{restDayCard.message}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <CardContent className="p-6 text-center">
                          <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                          {restDayCard?.title && <p className="text-lg font-semibold">{restDayCard.title}</p>}
                          {restDayCard?.message && <p className="text-sm text-muted-foreground">{restDayCard.message}</p>}
                        </CardContent>
                      )}
                    </Card>
                    )
                  ) : (
                    <div>
                      <div ref={scrollRef} className={hasMultiple ? "flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide" : ""}>
                        {todaysWorkouts.map((workout) => {
                          // Check if this workout has a session today
                          const workoutSession = (todayTrackedAssignedSessions || []).find(
                            (s: any) => s.workout_plan_id === workout.workout_plan_id || s.client_workout_id === workout.id
                          );
                          const isCompleted = !!workout.completed_at || (workoutSession && workoutSession.status === "completed");
                          const isInProgress = workoutSession?.status === "in_progress";
                          const isPartial = workoutSession?.status === "partial";
                          const pct = workoutSession?.completion_percentage || 0;

                          return (
                          <Card
                            key={workout.id}
                            className={`overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 shrink-0 snap-center ${hasMultiple ? "w-full min-w-full" : "w-full"}`}
                            onClick={() => navigate(`/client/workouts/${workout.workout_plan_id}`)}
                          >
                            <div className="relative h-56 bg-gradient-to-br from-primary/20 to-primary/5">
                              {workout.workout_plan?.image_url ? (
                                <img src={workout.workout_plan.image_url} alt={workout.workout_plan.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Dumbbell className="h-16 w-16 text-primary/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                              
                              {/* Status badge */}
                              {(isCompleted || isInProgress || isPartial) && (
                                <div className="absolute top-3 right-3">
                                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                    isCompleted ? "bg-emerald-500 text-white" :
                                    isInProgress ? "bg-amber-500 text-white" :
                                    "bg-sky-500 text-white"
                                  }`}>
                                    {isCompleted ? (
                                      <><Check className="h-3 w-3" /> Completed</>
                                    ) : isInProgress ? (
                                      <><Clock className="h-3 w-3" /> {pct}% · Resume</>
                                    ) : (
                                      <><Check className="h-3 w-3" /> {pct}% Tracked</>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Today's Workout</p>
                                <p className="text-lg font-bold text-white">{workout.workout_plan?.name}</p>
                                {/* Progress bar for in-progress */}
                                {isInProgress && pct > 0 && (
                                  <div className="mt-2 w-full bg-white/20 rounded-full h-1.5">
                                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <CardContent className="p-3">
                              <Button className="w-full" size="lg" variant="outline" onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/client/workouts/${workout.workout_plan_id}`);
                              }}>
                                {isInProgress ? "Resume Workout" : isCompleted ? "View Summary" : "View Workout"}
                              </Button>
                            </CardContent>
                          </Card>
                          );
                        })}
                        {todaysScheduledCardio.map((session: any) => {
                          const activityLabel = String(session.activity_type)
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (s: string) => s.toUpperCase());
                          const CardioIcon = getCardioIconComponent(session.activity_type);
                          const targetText = session.target_value && session.target_type && session.target_type !== "none"
                            ? session.target_type === "time"
                              ? `${Math.round(session.target_value / 60)} min target`
                              : session.target_type === "distance"
                                ? `${session.target_value} mi target`
                                : null
                            : null;
                          return (
                            <Card
                              key={session.id}
                              className={`overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 shrink-0 snap-center ${hasMultiple ? "w-full min-w-full" : "w-full"}`}
                              onClick={() => openCardioSession({
                                id: session.id,
                                activity_type: session.activity_type,
                                target_type: session.target_type,
                                target_value: session.target_value,
                              })}
                            >
                              <div className="relative h-56 bg-gradient-to-br from-rose-500/20 to-rose-500/5">
                                <div className="w-full h-full flex items-center justify-center">
                                  <CardioIcon className="h-16 w-16 text-rose-400/30" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Quick Cardio</p>
                                  <p className="text-lg font-bold text-white">{activityLabel}</p>
                                  {targetText && (
                                    <p className="text-sm text-white/80 mt-0.5">{targetText}</p>
                                  )}
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <Button
                                  className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                                  size="lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCardioSession({
                                      id: session.id,
                                      activity_type: session.activity_type,
                                      target_type: session.target_type,
                                      target_value: session.target_value,
                                    });
                                  }}
                                >
                                  Start Cardio
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {todaySportEvents?.map((event: any) => {
                          const isGame = event.event_type === "game" || event.event_type === "event";
                          const customCard = isGame ? gameCard : practiceCard;
                          const EventIcon = isGame ? Swords : Trophy;
                          const gradientFrom = isGame ? "from-rose-500/20" : "from-sky-500/20";
                          const gradientTo = isGame ? "to-rose-500/5" : "to-sky-500/5";
                          const iconColor = isGame ? "text-rose-400/30" : "text-sky-400/30";
                          const label = isGame ? "Game Day" : "Practice";
                          const startTime = formatEventTime(event.start_time);
                          const endTime = event.end_time ? formatEventTime(event.end_time) : null;
                          const timeDisplay = endTime && endTime !== startTime ? `${startTime} - ${endTime}` : startTime;
                          const completion = sportEventCompletions?.find((c: any) => c.sport_event_id === event.id);
                          const isEventCompleted = !!completion;
                          return (
                            <Card
                              key={event.id}
                              className={`overflow-hidden shrink-0 snap-center cursor-pointer hover:shadow-md transition-all ${hasMultiple ? "w-full min-w-full" : "w-full"} ${isEventCompleted ? "opacity-75" : ""}`}
                              onClick={() => {
                                if (!isEventCompleted) {
                                  setSelectedSportEvent(event);
                                  setSportCompletionOpen(true);
                                }
                              }}
                            >
                              <div className={`relative h-56 bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>
                                {customCard?.image_url ? (
                                  <img src={customCard.image_url} alt={label} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <EventIcon className={`h-16 w-16 ${iconColor}`} />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                {isEventCompleted && (
                                  <div className="absolute top-3 right-3">
                                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                      completion.status === 'completed' ? 'bg-emerald-500 text-white' :
                                      completion.status === 'incomplete' ? 'bg-amber-500 text-white' :
                                      'bg-destructive text-white'
                                    }`}>
                                      <Check className="h-3 w-3" />
                                      {completion.status === 'completed' ? 'Done' : completion.status === 'incomplete' ? 'Partial' : 'Missed'}
                                    </div>
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{label}</p>
                                  <p className="text-lg font-bold text-white">{event.title}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <p className="text-sm text-white/80">{timeDisplay}</p>
                                    {event.location && (
                                      <p className="text-sm text-white/80 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {event.location}
                                      </p>
                                    )}
                                  </div>
                                  {customCard?.message && (
                                    <p className="text-sm text-white/90 mt-1 font-medium">{customCard.message}</p>
                                  )}
                                </div>
                              </div>
                              {!isEventCompleted && (
                                <CardContent className="p-3">
                                  <Button className="w-full" size="lg" variant="outline" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSportEvent(event);
                                    setSportCompletionOpen(true);
                                  }}>
                                    Log {isGame ? "Game" : "Practice"}
                                  </Button>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                      {hasMultiple && (
                        <div className="flex justify-center gap-1.5 mt-3">
                          {Array.from({ length: totalCards }).map((_, i) => (
                            <button
                              key={i}
                              className={`h-2 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                              onClick={() => {
                                scrollRef.current?.scrollTo({ left: i * (scrollRef.current?.clientWidth || 0), behavior: "smooth" });
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null;

            case "fasting":
              return settings.fasting_enabled && !engineConfig.fastingDisabled && !isViewingOtherDay ? (
                <div key="fasting" className="space-y-3">
                  <FastingProtocolCard clientId={clientId} navigate={navigate} openEndFastFlowSignal={openEndFastFlowSignal} />
                  {dashRecentFastLog && (
                    <FastingStatusCard
                      actualHours={dashRecentFastLog.actual_hours}
                      targetHours={dashRecentFastLog.target_hours}
                      completionPct={dashRecentFastLog.completion_pct}
                      endedEarly={dashRecentFastLog.ended_early}
                    />
                  )}
                </div>
              ) : null;

            case "restore":
              return null;

            case "daily_journal":
              return !isViewingOtherDay ? (
                <DailyJournalCard key="daily_journal" />
              ) : null;

            case "engine_cards":
              return null;

            case "assigned_plan":
              return null;

            case "coach_tip":
              return !isViewingOtherDay && settings.fasting_enabled && !engineConfig.fastingDisabled && (fastingState?.selected_protocol_id || fastingState?.maintenance_mode) ? (
                <FastingCoachTipCard
                  key="coach_tip"
                  protocolStartDate={fastingState?.protocol_start_date ?? null}
                  protocolDurationDays={coachTipProtocol?.duration_days ?? null}
                  hideProtocolProgress={!!fastingState?.maintenance_mode}
                />
              ) : null;

            case "habits":
              return settings.tasks_enabled && habits && habits.length > 0 && !isViewingOtherDay ? (
                <div key="habits">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold">Habits</h2>
                    <button onClick={() => navigate("/client/habits")} className="text-sm font-semibold text-primary">View all</button>
                  </div>
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {habits.map((habit: any) => {
                        const habitRows = habitCompletions?.filter((c: any) => c.habit_id === habit.id) || [];
                        const todayCompletionCount = ["steps", "miles", "minutes", "hours"].includes(habit.goal_unit)
                          ? (habitRows[0]?.value ?? 0)
                          : habitRows.reduce((sum: number, c: any) => sum + (c.value ?? 1), 0);
                        const icon = habit.icon_url?.startsWith("emoji:") ? habit.icon_url.replace("emoji:", "") : "🎯";
                        return (
                          <div
                            key={habit.id}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => navigate(`/client/habits/${habit.id}`)}
                          >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold">{habit.name}</span>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {todayCompletionCount} of {habit.goal_value} {habit.goal_unit} today
                                {habit.reminder_enabled && habit.reminder_time && (
                                  <span className="ml-1.5 text-primary/70">⏰ {habit.reminder_time.slice(0, 5)}</span>
                                )}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              ) : null;

            case "nutrition":
              if (!settings.macros_enabled || isViewingOtherDay) return null;
              if (!macroTargets) {
                return (
                  <div key="nutrition">
                    <Card className="overflow-hidden cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/macro-setup")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-base">Set Macro Goals</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              Macros First, Magic Later.{"\n"}Let's Lock in That Goal Today!
                            </p>
                            <button className="text-sm font-semibold text-primary mt-2">Set goals</button>
                          </div>
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-3xl">
                            🍱
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              }
              const dietPreset = getDietStylePreset((macroTargets as any)?.diet_style);
              const cutMeta = getCutLevelMeta((macroTargets as any)?.deficit_pct);
              const deficitPct = typeof (macroTargets as any)?.deficit_pct === "number"
                ? Math.round((macroTargets as any).deficit_pct * 100)
                : null;
              const calGoal = Number(macroTargets.target_calories) || 0;
              return (
                <div key="nutrition">
                  <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/nutrition")}>
                    <CardContent className="p-4">
                      {/* Header row: title + Edit */}
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold">Nutrition</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={(e) => { e.stopPropagation(); openMacroEdit(); }}
                        >
                          <Pencil className="h-3 w-3" /> Macro Plan
                        </Button>
                      </div>

                      {/* Top row: stacked info on left, donut on right */}
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="text-5xl font-extrabold leading-none text-primary tracking-tight">
                              {todayCalories.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1.5">
                              of <span className="font-semibold text-foreground">{calGoal.toLocaleString()}</span> cal goal
                            </div>
                          </div>

                          {dietPreset && (
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: dietPreset.color }}
                              />
                              <span className="font-medium text-foreground truncate">
                                {dietPreset.label}
                                <span className="text-muted-foreground ml-1">({dietPreset.abbreviation})</span>
                              </span>
                            </div>
                          )}

                          {deficitPct !== null && deficitPct !== 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${cutMeta.dot}`} />
                              <span className={`font-medium ${cutMeta.text} truncate`}>
                                {cutMeta.label} {deficitPct > 0 ? "+" : ""}{deficitPct}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="relative w-24 h-24 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { value: todayCalories, color: "hsl(var(--primary))" },
                                  { value: Math.max(calGoal - todayCalories, 0), color: "hsl(var(--muted))" },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={32}
                                outerRadius={46}
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={0}
                                dataKey="value"
                                strokeWidth={0}
                              >
                                <Cell fill="hsl(var(--primary))" />
                                <Cell fill="hsl(var(--muted))" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-bold text-foreground leading-none">
                              {calGoal > 0 ? Math.round((todayCalories / calGoal) * 100) : 0}%
                            </span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">of goal</span>
                          </div>
                        </div>
                      </div>

                      {/* Stacked macro rows */}
                      <div className="space-y-2.5 mt-4">
                        {[
                          { label: "Protein", emoji: "🥩", current: Math.round(todayProtein), target: Math.round(Number(macroTargets.target_protein) || 0), color: "#6366f1" },
                          { label: "Carbs", emoji: "🍚", current: Math.round(todayCarbs), target: Math.round(Number(macroTargets.target_carbs) || 0), color: "#22c55e" },
                          { label: "Fats", emoji: "🥑", current: Math.round(todayFats), target: Math.round(Number(macroTargets.target_fats) || 0), color: "#eab308" },
                        ].map((macro) => (
                          <div key={macro.label} className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-foreground w-20 shrink-0 flex items-center gap-1.5">
                              <span className="text-base leading-none">{macro.emoji}</span>
                              {macro.label}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${macro.target > 0 ? Math.min((macro.current / macro.target) * 100, 100) : 0}%`,
                                  backgroundColor: macro.color,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-16 text-right shrink-0">
                              {macro.current}/{macro.target}g
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Conditional gates / + Log meal footer */}
                      {mealGateStatus === "fasting" ? (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">You're currently fasting. Meals unlock when your fast ends.</p>
                          <p className="text-[10px] text-muted-foreground">Eating window opens at {fastEndTimeStr}</p>
                          <Button variant="outline" size="sm" className="w-full" onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("fasting-protocol-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                            setOpenEndFastFlowSignal((prev) => prev + 1);
                          }}>
                            End Fast
                          </Button>
                        </div>
                      ) : mealGateStatus === "strict_locked" ? (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Start a fast to open your eating window.</p>
                          <Button variant="outline" size="sm" className="w-full gap-1" onClick={(e) => { e.stopPropagation(); navigate("/client/programs"); }}>
                            <Clock className="h-3.5 w-3.5" /> Start Fast
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4 pt-3 border-t border-border">
                          <button
                            type="button"
                            className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); navigate("/client/log-meal"); }}
                          >
                            <Plus className="h-4 w-4" /> Log meal
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );

            case "food_journal":
              return settings.food_journal_enabled && !settings.macros_enabled && !isViewingOtherDay ? (
                <div key="food_journal">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Food Journal</h2>
                  <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/nutrition")}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-accent/10 rounded-xl">
                        <UtensilsCrossed className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {todayMealCount > 0
                            ? `${todayMealCount} meal${todayMealCount > 1 ? "s" : ""} logged • ${todayCalories} cal`
                            : "What did you eat today?"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {todayMealCount > 0 ? "Tap to add more" : "Track your meals and macros"}
                        </p>
                      </div>
                      {mealGateStatus === "fasting" ? (
                        <div className="text-right space-y-1">
                          <p className="text-[10px] text-muted-foreground">Fasting · opens at {fastEndTimeStr}</p>
                        </div>
                      ) : mealGateStatus === "strict_locked" ? (
                        <div className="text-right space-y-1">
                          <p className="text-[10px] text-muted-foreground">Start a fast first</p>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate("/client/nutrition"); }}>
                          Add meal
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null;

            case "step_tracker":
              return null;

            case "tasks":
              return settings.tasks_enabled && tasks && tasks.length > 0 && !isViewingOtherDay ? (
                <div key="tasks">
                  {completedTaskCount === totalTaskCount && totalTaskCount > 0 ? (
                    <h2 className="text-sm font-bold mb-2">All tasks completed 🎉</h2>
                  ) : (
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Tasks ({completedTaskCount}/{totalTaskCount})
                    </h2>
                  )}
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {tasks.slice(0, 5).map((task) => {
                        return (
                          <SwipeToDeleteTaskRow
                            key={task.id}
                            task={task}
                            onDelete={() => deleteTaskMutation.mutate(task.id)}
                            onClick={() => navigate(`/client/tasks/${task.id}`)}
                          />
                        );
                      })}
                    </CardContent>
                  </Card>
                  {tasks.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => navigate("/client/tasks")}>
                      View all tasks
                    </Button>
                  )}
                </div>
              ) : null;

            case "progress":
              return SHOW_WEIGHT_TRACKER && settings.body_metrics_enabled && clientId ? (
                <MyProgressSection key="progress" clientId={clientId} />
              ) : null;

            case "game_stats":
              return <LatestGameStatsCard key="game_stats" clientId={clientId} navigate={navigate} />;

            case "cardio":
              return null;

            case "metabolic_control":
              return settings.macros_enabled && settings.fasting_enabled && !engineConfig.fastingDisabled && !isViewingOtherDay ? (
                <MetabolicControlDashboard key="metabolic_control" />
              ) : null;

            default:
              return null;
          }
        })}

        {/* Workout Tracker is now rendered after DailyScoreRing */}

        {/* Metabolic Control Dashboard — auto-render if not in layout */}
        {settings.macros_enabled && settings.fasting_enabled && !engineConfig.fastingDisabled && !isViewingOtherDay &&
          !layoutCards.some(c => c.key === "metabolic_control" && c.visible) && (
          <MetabolicControlDashboard />
        )}

        {/* Install App Banner (always at bottom, not layout-driven) */}
        {showInstallBanner && (
          <Card className="border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="p-4 relative">
              <button onClick={dismissInstallBanner} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="pr-4">
                  <p className="font-bold text-sm">📲 Install the app to get notifications</p>
                  {isIOS ? (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs text-muted-foreground leading-relaxed">Get workout reminders on your lock screen:</p>
                      <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-0.5 leading-relaxed">
                        <li>Tap the <span className="font-semibold text-foreground">Share</span> button <span className="inline-block">⬆️</span> in Safari</li>
                        <li>Scroll down and tap <span className="font-semibold text-foreground">"Add to Home Screen"</span></li>
                        <li>Open the app from your home screen</li>
                        <li>Enable notifications in Settings</li>
                      </ol>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Add to your home screen for workout reminders, quick access, and offline use.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Speed Dial FAB */}
      <SpeedDialFAB
        items={[
          {
            label: "Workout",
            icon: <Dumbbell className="h-5 w-5" />,
            color: "hsl(217, 91%, 60%)",
            onClick: () => navigate("/client/wod-builder"),
          },
          {
            label: "Cardio",
            icon: <Footprints className="h-5 w-5" />,
            color: "hsl(142, 71%, 45%)",
            onClick: () => setCardioFlowOpen(true),
          },
          {
            label: "Meal",
            icon: <UtensilsCrossed className="h-5 w-5" />,
            color: "hsl(350, 89%, 60%)",
            onClick: () => navigate("/client/log-meal"),
            subItems: [
              { label: "Scan Barcode", icon: <ScanBarcode className="h-4 w-4" />, onClick: () => navigate("/client/log-meal?tab=scan") },
              { label: "Snap & Track", icon: <Camera className="h-4 w-4" />, onClick: () => navigate("/client/log-meal?tab=photo") },
              { label: "Manual Log", icon: <PenLine className="h-4 w-4" />, onClick: () => navigate("/client/log-meal?tab=manual") },
            ],
          },
        ]}
      />

      {/* Ask KSOM-360 AI */}
      {clientId && <AskKsomAI clientId={clientId} />}

      {/* Floating Message Button */}
      {/* Floating Message Button - positioned just above the nav bar */}
      <div className="fixed right-4 z-30" style={{ bottom: 'calc(5rem + max(env(safe-area-inset-bottom, 0px), 4px))' }}>
        <button
          onClick={() => navigate("/client/messages")}
          className="relative w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 overflow-visible"
          aria-label="Messages"
        >
          <img src="/logo.png" alt="Messages" className="w-11 h-11 rounded-full object-cover" />
          {unreadMessageCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1 border-2 border-background shadow-md z-10">
              {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
            </span>
          )}
        </button>
      </div>

      <BuildWorkoutSheet open={wodSheetOpen} onOpenChange={setWodSheetOpen} />

      <QuickCardioFlow
        open={cardioFlowOpen}
        onOpenChange={setCardioFlowOpen}
        onStart={handleCardioStart}
        onMarkComplete={handleCardioComplete}
      />

      {selectedCardioSession && (
        <CardioDetailSheet
          open={!!selectedCardioSession}
          onOpenChange={(open) => !open && setSelectedCardioSession(null)}
          session={selectedCardioSession}
        />
      )}

      {/* Quick Edit Macros Sheet */}
      <Sheet open={macroEditOpen} onOpenChange={setMacroEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <div className="space-y-5 pb-6">
            <div className="text-center pt-2">
              <h2 className="text-lg font-bold">Change Macro Plan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Pick a preset or customize your own</p>
            </div>

            {/* Preset options */}
            <div className="space-y-2">
              {DIET_STYLES.map((preset) => {
                const isActive = (macroTargets as any)?.diet_style === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleDietPresetSelect(preset)}
                    disabled={saveMacrosMutation.isPending}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">{preset.split}</p>
                    </div>
                    {isActive && (
                      <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">or customize</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Custom section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">Custom Macros</Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className={editMode === "grams" ? "font-bold text-foreground" : "text-muted-foreground"}>Grams</span>
                  <Switch
                    checked={editMode === "percent"}
                    onCheckedChange={(checked) => {
                      setEditMode(checked ? "percent" : "grams");
                      if (checked && macroTargets) {
                        const cals = macroTargets.target_calories || 2000;
                        const totalMacroCals = (Number(macroTargets.target_protein) || 0) * 4 + (Number(macroTargets.target_carbs) || 0) * 4 + (Number(macroTargets.target_fats) || 0) * 9;
                        setCustomProtein(String(totalMacroCals > 0 ? Math.round(((Number(macroTargets.target_protein) || 0) * 4 / totalMacroCals) * 100) : 0));
                        setCustomCarbs(String(totalMacroCals > 0 ? Math.round(((Number(macroTargets.target_carbs) || 0) * 4 / totalMacroCals) * 100) : 0));
                        setCustomFats(String(totalMacroCals > 0 ? Math.round(((Number(macroTargets.target_fats) || 0) * 9 / totalMacroCals) * 100) : 0));
                      } else if (macroTargets) {
                        setCustomProtein(String(Math.round(Number(macroTargets.target_protein) || 0)));
                        setCustomCarbs(String(Math.round(Number(macroTargets.target_carbs) || 0)));
                        setCustomFats(String(Math.round(Number(macroTargets.target_fats) || 0)));
                      }
                    }}
                  />
                  <span className={editMode === "percent" ? "font-bold text-foreground" : "text-muted-foreground"}>%</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Calories</Label>
                <Input type="number" value={customCalories} onChange={e => setCustomCalories(e.target.value)} placeholder="2000" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Protein {editMode === "percent" ? "%" : "(g)"}</Label>
                  <Input type="number" value={customProtein} onChange={e => setCustomProtein(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Carbs {editMode === "percent" ? "%" : "(g)"}</Label>
                  <Input type="number" value={customCarbs} onChange={e => setCustomCarbs(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fats {editMode === "percent" ? "%" : "(g)"}</Label>
                  <Input type="number" value={customFats} onChange={e => setCustomFats(e.target.value)} className="mt-1" />
                </div>
              </div>
              <Button className="w-full h-11 font-semibold" onClick={handleCustomSave} disabled={saveMacrosMutation.isPending}>
                {saveMacrosMutation.isPending ? "Saving..." : "Save Custom Macros"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sport Event Completion Dialog */}
      {selectedSportEvent && (
        <SportEventCompletionDialog
          open={sportCompletionOpen}
          onOpenChange={setSportCompletionOpen}
          event={selectedSportEvent}
          clientId={clientId!}
        />
      )}
    </ClientLayout>
  );
}

function LatestGameStatsCard({ clientId, navigate }: { clientId: string | undefined; navigate: (path: string) => void }) {
  const { data: latestGame } = useQuery({
    queryKey: ["latest-game-stat", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_stat_entries" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("game_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!clientId,
  });

  if (!latestGame) return null;

  const battingAvg = latestGame.at_bats > 0 ? (latestGame.hits / latestGame.at_bats).toFixed(3) : ".000";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Game</h2>
        <button onClick={() => navigate("/client/sports")} className="text-xs font-semibold text-primary">View all</button>
      </div>
      <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/client/sports")}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{latestGame.opponent ? `vs ${latestGame.opponent}` : "Game"}</p>
              <p className="text-xs text-muted-foreground">{latestGame.game_date}</p>
            </div>
            {latestGame.result && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                latestGame.result === "win" ? "bg-emerald-500/10 text-emerald-600" :
                latestGame.result === "loss" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              }`}>
                {latestGame.result}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-center">
            <div>
              <p className="text-base font-bold">{battingAvg}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">AVG</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.hits}/{latestGame.at_bats}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">H/AB</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.runs || 0}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">R</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.rbis || 0}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">RBI</p>
            </div>
            <div>
              <p className="text-base font-bold">{latestGame.home_runs || 0}</p>
              <p className="text-[9px] text-muted-foreground font-semibold uppercase">HR</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
