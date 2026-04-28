import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Target, Sparkles } from "lucide-react";
import {
  useChallengeById,
  useUserChallengeForChallenge,
  useJoinChallenge,
  useLeaveChallenge,
  useComputedProgress,
} from "@/hooks/useExplore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { ChallengeBadge } from "@/components/explore/ChallengeBadge";
import { LionWatermark } from "@/components/explore/LionWatermark";

const BG = "hsl(0 0% 4%)";
const SURFACE = "hsl(0 0% 6%)";
const GOLD = "hsl(42 70% 55%)";
const IVORY = "hsl(40 20% 92%)";
const MUTED = "hsl(40 10% 65%)";
const HAIRLINE = "hsl(42 70% 55% / 0.25)";

export default function ClientExploreChallenge() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: challenge, isLoading } = useChallengeById(id);
  const { data: userChallenge } = useUserChallengeForChallenge(id);
  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const { updateAvailable } = useAppUpdate();

  const ucWithChallenge =
    userChallenge && challenge ? { ...userChallenge, challenge } : undefined;
  const { data: progress = 0 } = useComputedProgress(ucWithChallenge as any);

  if (isLoading) {
    return (
      <div className="p-8 text-center" style={{ background: BG, color: MUTED, minHeight: "100vh" }}>
        Loading…
      </div>
    );
  }
  if (!challenge) {
    return (
      <div className="p-8 text-center" style={{ background: BG, minHeight: "100vh" }}>
        <p style={{ color: MUTED }}>Challenge not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const target = Number(challenge.target_value || 1);
  const pct = Math.min(100, Math.round((Number(progress) / target) * 100));
  const isJoined = !!userChallenge;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <UpdateBanner />
      <header
        className="px-4 shrink-0 sticky top-0 z-40"
        style={{
          background: BG,
          borderBottom: `1px solid ${HAIRLINE}`,
          paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)",
        }}
      >
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full"
            style={{ border: `1px solid ${HAIRLINE}`, color: GOLD }}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <h1
            className="flex-1 text-center text-base tracking-wide pr-9 truncate"
            style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
          >
            {challenge.title}
          </h1>
        </div>
      </header>

      <main
        className="flex-1 overflow-auto"
        style={{ paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom, 0px), 4px))" }}
      >
        {/* Hero with watermark */}
        <div
          className="relative h-56 flex items-center justify-center overflow-hidden"
          style={{ background: SURFACE, borderBottom: `1px solid ${HAIRLINE}` }}
        >
          <LionWatermark opacity={0.14} />
          <div className="relative">
            <ChallengeBadge
              label={challenge.badge_label}
              color={challenge.badge_color}
              type={challenge.type}
              size="lg"
            />
          </div>
        </div>

        <div className="px-6 pt-8 pb-4 text-center space-y-3">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
            The Challenge · {challenge.type}
          </p>
          <div className="mx-auto h-px w-10" style={{ background: GOLD }} />
          <h2
            className="text-3xl leading-tight tracking-tight"
            style={{ color: IVORY, fontFamily: "Georgia, serif", fontWeight: 400 }}
          >
            {challenge.title}
          </h2>
          {challenge.subtitle && (
            <p className="text-sm max-w-md mx-auto" style={{ color: MUTED }}>
              {challenge.subtitle}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="px-6 pt-2 pb-6 flex justify-center">
          {!isJoined ? (
            <button
              onClick={() => id && join.mutate(id)}
              disabled={join.isPending}
              className="px-10 py-3 text-[11px] uppercase tracking-[0.4em] disabled:opacity-50"
              style={{
                border: `1px solid ${GOLD}`,
                color: GOLD,
                fontFamily: "Georgia, serif",
                background: "transparent",
              }}
            >
              {join.isPending ? "Joining…" : "Join Challenge"}
            </button>
          ) : (
            <button
              onClick={() => userChallenge && leave.mutate(userChallenge.id)}
              className="px-10 py-3 text-[11px] uppercase tracking-[0.4em]"
              style={{
                border: `1px solid ${HAIRLINE}`,
                color: MUTED,
                fontFamily: "Georgia, serif",
                background: "transparent",
              }}
            >
              Leave
            </button>
          )}
        </div>

        <div className="px-6 space-y-6">
          {/* Meta lines */}
          <div className="space-y-3" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
            <div
              className="flex items-center gap-3 py-3"
              style={{ borderTop: `1px solid ${HAIRLINE}` }}
            >
              <Calendar className="h-4 w-4" strokeWidth={1.25} style={{ color: GOLD }} />
              <span className="text-sm">{challenge.duration_days} days</span>
            </div>
            <div
              className="flex items-center gap-3 py-3"
              style={{ borderTop: `1px solid ${HAIRLINE}` }}
            >
              <Target className="h-4 w-4" strokeWidth={1.25} style={{ color: GOLD }} />
              <span className="text-sm">
                {challenge.subtitle || `Reach ${challenge.target_value} ${challenge.target_unit}`}
              </span>
            </div>
          </div>

          {isJoined && (
            <div className="relative overflow-hidden p-5 space-y-3" style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}>
              <LionWatermark opacity={0.05} />
              <div className="relative flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: GOLD }}>
                  Your Progress
                </p>
                <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: MUTED }}>
                  {progress}/{target} {challenge.target_unit}
                </p>
              </div>
              <Progress value={pct} className="relative h-[2px]" />
            </div>
          )}

          {challenge.description && (
            <div className="space-y-4 pt-2">
              {challenge.description.split("\n\n").map((p, i) => (
                <p
                  key={i}
                  className="text-[15px] leading-[1.8]"
                  style={{ color: IVORY, fontFamily: "Georgia, serif" }}
                >
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* Numbers */}
          <div className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-6" style={{ background: GOLD }} />
              <h3
                className="text-[11px] uppercase tracking-[0.4em]"
                style={{ color: GOLD, fontFamily: "Georgia, serif" }}
              >
                The Numbers
              </h3>
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}>
              <div
                className="flex items-center justify-between p-4"
                style={{ borderBottom: `1px solid ${HAIRLINE}` }}
              >
                <span className="text-sm" style={{ color: MUTED, fontFamily: "Georgia, serif" }}>
                  Participants
                </span>
                <span style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
                  {challenge.participants.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-sm" style={{ color: MUTED, fontFamily: "Georgia, serif" }}>
                  Difficulty
                </span>
                <span className="capitalize" style={{ color: IVORY, fontFamily: "Georgia, serif" }}>
                  {challenge.difficulty}
                </span>
              </div>
            </div>
          </div>

          {challenge.tips && challenge.tips.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px w-6" style={{ background: GOLD }} />
                <h3
                  className="text-[11px] uppercase tracking-[0.4em] flex items-center gap-2"
                  style={{ color: GOLD, fontFamily: "Georgia, serif" }}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.25} />
                  For Success
                </h3>
              </div>
              <div className="p-5 space-y-4 relative overflow-hidden" style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}>
                <LionWatermark opacity={0.04} />
                {challenge.tips.map((tip, i) => (
                  <div key={i} className="relative flex gap-4">
                    <span
                      className="text-[10px] uppercase tracking-[0.3em] pt-1"
                      style={{ color: GOLD, fontFamily: "Georgia, serif" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p
                      className="flex-1 text-[14px] leading-[1.7]"
                      style={{ color: IVORY, fontFamily: "Georgia, serif" }}
                    >
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <ClientBottomNav />
    </div>
  );
}
