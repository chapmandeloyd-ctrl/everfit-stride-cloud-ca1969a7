import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function ActivateStep({
  loading,
  onActivate,
  onExplore,
}: {
  loading: boolean;
  onActivate: () => void;
  onExplore: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="relative animate-scale-in">
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: "hsl(var(--primary) / 0.4)" }}
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--primary))]">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Your metabolic reset starts now.
          </h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-white/65">
            Your personalized path is ready. One simple action at a time.
          </p>
        </div>
      </div>
      <div className="w-full space-y-3 pb-2">
        <Button
          onClick={onActivate}
          disabled={loading}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          {loading ? "Activating..." : "Activate My Plan"}
        </Button>
        <button
          onClick={onExplore}
          disabled={loading}
          className="w-full text-sm text-white/60 underline-offset-4 hover:underline"
        >
          Explore Dashboard
        </button>
      </div>
    </div>
  );
}
