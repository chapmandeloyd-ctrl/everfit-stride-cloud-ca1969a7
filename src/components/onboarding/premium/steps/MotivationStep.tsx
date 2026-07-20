import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export default function MotivationStep({
  initial,
  onNext,
}: {
  initial: string;
  onNext: (motivation: string) => void;
}) {
  const [text, setText] = useState(initial ?? "");

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-white/50">One last thing</div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Why now?</h2>
        <p className="mt-1 text-sm text-white/60">
          One sentence. Your AI coach will remember this when it builds — and adjusts — your plan.
        </p>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <Heart className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 240))}
          rows={4}
          placeholder="e.g. I want to feel light again for my daughter's wedding in the spring."
          className="w-full resize-none bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>
      <div className="-mt-3 text-right text-[11px] text-white/40">{text.length}/240</div>
      <div className="mt-auto pb-2">
        <Button
          onClick={() => onNext(text.trim())}
          disabled={text.trim().length < 4}
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-medium"
        >
          Build my plan
        </Button>
      </div>
    </div>
  );
}