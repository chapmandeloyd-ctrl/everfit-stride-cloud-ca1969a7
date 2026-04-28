import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Target, Users, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

const BANNER_COLORS: Record<string, string> = {
  green: "bg-emerald-700",
  purple: "bg-purple-600",
  pink: "bg-pink-600",
  red: "bg-primary",
};

export default function ClientExploreChallenge() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: challenge, isLoading } = useChallengeById(id);
  const { data: userChallenge } = useUserChallengeForChallenge(id);
  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const { updateAvailable } = useAppUpdate();

  const ucWithChallenge = userChallenge && challenge ? { ...userChallenge, challenge } : undefined;
  const { data: progress = 0 } = useComputedProgress(ucWithChallenge as any);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!challenge) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Challenge not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const target = Number(challenge.target_value || 1);
  const pct = Math.min(100, Math.round((Number(progress) / target) * 100));
  const isJoined = !!userChallenge;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UpdateBanner />
      <header
        className="bg-card border-b border-border px-4 shrink-0 sticky top-0 z-40"
        style={{ paddingTop: updateAvailable ? "12px" : "max(env(safe-area-inset-top, 0px), 12px)" }}
      >
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold tracking-tight pr-10 truncate">{challenge.title}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto" style={{ paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom, 0px), 4px))" }}>
        {/* Hero banner */}
        <div className={cn("relative h-48 flex items-end px-5 pb-0", BANNER_COLORS[challenge.badge_color] || BANNER_COLORS.green)}>
          <div className="absolute -bottom-8 left-5">
            <ChallengeBadge label={challenge.badge_label} color={challenge.badge_color} type={challenge.type} size="lg" className="ring-4 ring-background" />
          </div>
        </div>

        <div className="pt-12 px-5 pb-2 flex justify-end">
          {!isJoined ? (
            <Button
              size="lg"
              onClick={() => id && join.mutate(id)}
              disabled={join.isPending}
              className="rounded-full px-8 bg-primary hover:bg-primary/90"
            >
              {join.isPending ? "Joining…" : "Join Challenge"}
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => userChallenge && leave.mutate(userChallenge.id)}
              className="rounded-full px-8"
            >
              Leave
            </Button>
          )}
        </div>

        <div className="px-5 pt-2 space-y-5">
          <p className={cn("text-[10px] font-bold tracking-[0.2em] uppercase", typeColor(challenge.type))}>{challenge.type}</p>
          <h2 className="text-3xl font-bold tracking-tight leading-tight">
            {challenge.subtitle ? `Join Us: ${challenge.title}` : challenge.title}
          </h2>

          <div className="space-y-3 text-foreground/90">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>{challenge.duration_days} days</span>
            </div>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span>{challenge.subtitle || `Reach ${challenge.target_value} ${challenge.target_unit}`}</span>
            </div>
          </div>

          {isJoined && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Your Progress</p>
                <p className="text-sm text-muted-foreground">
                  {progress}/{target} {challenge.target_unit}
                </p>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          )}

          {challenge.description && (
            <div className="space-y-3 pt-2">
              {challenge.description.split("\n\n").map((p, i) => (
                <p key={i} className="text-base leading-relaxed text-foreground/90">{p}</p>
              ))}
            </div>
          )}

          <div className="pt-4">
            <h3 className="text-xl font-bold mb-3">Challenge Numbers</h3>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <span className="text-foreground/80">Participants</span>
                <span className="font-bold">{challenge.participants.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-foreground/80">Difficulty</span>
                <span className="font-bold capitalize">{challenge.difficulty}</span>
              </div>
            </div>
          </div>

          {challenge.tips && challenge.tips.length > 0 && (
            <div className="pt-4">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Tips for Success
              </h3>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                {challenge.tips.map((tip, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <p className="text-foreground/90 flex-1">{tip}</p>
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

function typeColor(type: string): string {
  switch (type) {
    case "fasting": return "text-emerald-600";
    case "sleep": return "text-purple-500";
    case "movement": return "text-pink-500";
    case "journal": return "text-amber-500";
    default: return "text-muted-foreground";
  }
}
