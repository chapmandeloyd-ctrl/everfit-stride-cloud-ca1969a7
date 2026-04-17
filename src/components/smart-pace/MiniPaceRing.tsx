import { useNavigate } from "react-router-dom";
import { useSmartPace } from "@/hooks/useSmartPace";
import { cn } from "@/lib/utils";

/**
 * Mini Pace Ring — 36px header indicator that reflects today's pace status.
 * Click → /client/pace detail page.
 */
export function MiniPaceRing() {
  const { data, isLoading } = useSmartPace();
  const navigate = useNavigate();

  if (isLoading || !data?.enabled || !data.goal) return null;

  const { progressPct, status } = data;
  const stroke =
    status === "behind"
      ? "stroke-destructive"
      : status === "ahead"
      ? "stroke-emerald-500"
      : "stroke-primary";
  const label = status === "behind" ? "!" : status === "ahead" ? "↑" : `${Math.round(progressPct)}`;

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, progressPct)) / 100) * circumference;

  return (
    <button
      onClick={() => navigate("/client/pace")}
      aria-label="Smart Pace"
      className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90 h-9 w-9">
        <circle
          cx="18"
          cy="18"
          r={radius}
          className="stroke-muted/40"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          className={cn("transition-all", stroke)}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span
        className={cn(
          "text-[10px] font-bold relative",
          status === "behind" && "text-destructive",
          status === "ahead" && "text-emerald-500",
          status !== "behind" && status !== "ahead" && "text-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}
