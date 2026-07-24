import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import AIPlanProposalCard, { type AIProposal } from "@/components/client/AIPlanProposalCard";

export default function AIPlanProposalStep({
  clientId,
  onboardingPayload,
  isPreview,
  onAccept,
  onAdjust,
}: {
  clientId: string | null;
  onboardingPayload: Record<string, unknown>;
  isPreview: boolean;
  onAccept: (proposal: AIProposal) => void;
  onAdjust: (proposal: AIProposal) => void;
}) {
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenReason, setRegenReason] = useState("");
  const [showRegen, setShowRegen] = useState(false);

  const generate = async (reason?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-fasting-plan", {
        body: {
          client_id: clientId ?? null,
          preview: !clientId || isPreview,
          onboarding: onboardingPayload,
          regenerate_reason: reason ?? null,
        },
      });
      if (error) throw error;
      if (!data?.plan) throw new Error("No plan returned");
      setProposal(data.plan as AIProposal);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !proposal) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <Sparkles className="h-10 w-10 text-[hsl(var(--primary))]" />
          <Loader2 className="absolute -right-2 -bottom-2 h-5 w-5 animate-spin text-white/70" />
        </div>
        <div className="text-lg font-semibold text-white">Apex360 AI is building your plan…</div>
        <div className="max-w-xs text-sm text-white/60">
          Analyzing your rhythm, goals, and fuel style to design a plan that fits your real life.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {isPreview && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-center text-[11px] text-yellow-200">
          Preview mode — nothing will be saved to your account.
        </div>
      )}
      <AIPlanProposalCard
        proposal={proposal}
        loading={loading}
        onAccept={() => onAccept(proposal)}
        onAdjust={() => onAdjust(proposal)}
        onRegenerate={() => setShowRegen((s) => !s)}
      />
      {showRegen && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-white/60">What should change?</div>
          <textarea
            value={regenReason}
            onChange={(e) => setRegenReason(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="e.g. Start eating window later, I don't get hungry until 2 PM"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <button
            onClick={() => {
              setShowRegen(false);
              generate(regenReason);
              setRegenReason("");
            }}
            className="mt-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}