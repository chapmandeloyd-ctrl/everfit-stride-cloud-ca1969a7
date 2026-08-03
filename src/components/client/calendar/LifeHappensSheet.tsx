import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plane, Pause, Check } from "lucide-react";
import { dateKey, addDays } from "./calendarUtils";

export type LifeMode = "pause" | "travel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saving?: boolean;
  onApply: (opts: { mode: LifeMode; start: string; end: string; label: string }) => void;
}

export default function LifeHappensSheet({ open, onOpenChange, saving, onApply }: Props) {
  const [mode, setMode] = useState<LifeMode>("pause");
  const [start, setStart] = useState(dateKey(new Date()));
  const [end, setEnd] = useState(dateKey(addDays(new Date(), 6)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-4 pb-8">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">Life happens</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-sm text-muted-foreground">
          Going away or need a break? Your plan bends — it doesn't break. Nothing counts against you
          during these days.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("pause")}
            className={`rounded-2xl border p-4 text-left ${
              mode === "pause" ? "border-primary bg-primary/10" : "border-border bg-muted/20"
            }`}
          >
            <Pause className="mb-2 h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Pause plan</div>
            <div className="text-[11px] text-muted-foreground">No fasts scheduled</div>
          </button>
          <button
            onClick={() => setMode("travel")}
            className={`rounded-2xl border p-4 text-left ${
              mode === "travel" ? "border-primary bg-primary/10" : "border-border bg-muted/20"
            }`}
          >
            <Plane className="mb-2 h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Travel mode</div>
            <div className="text-[11px] text-muted-foreground">Easier 16:8, auto-reverts</div>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From</div>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 h-11" />
          </label>
          <label className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">To</div>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 h-11" />
          </label>
        </div>

        <Button
          size="lg"
          disabled={saving}
          onClick={() =>
            onApply({
              mode,
              start,
              end,
              label: mode === "pause" ? "Paused" : "Travel",
            })
          }
          className="mt-5 h-14 w-full rounded-2xl text-base font-semibold"
        >
          <Check className="mr-2 h-4 w-4" /> {saving ? "Applying..." : "Apply to these dates"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}