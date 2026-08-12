import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import type { JuiceDayLog, JuiceFastSession } from "@/lib/juiceFast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: JuiceFastSession;
  dayNumber: number;
  existing: JuiceDayLog | null;
  saving?: boolean;
  onSave: (input: {
    dayNumber: number;
    juiceCount: number;
    waterOz: number;
    snacked: boolean;
    snackNote?: string;
    energyRating?: number | null;
    notes?: string;
  }) => void;
}

const ENERGY = ["Rough", "Low", "OK", "Good", "Strong"];

export function JuiceDayLogSheet({ open, onOpenChange, session, dayNumber, existing, saving, onSave }: Props) {
  const [juiceCount, setJuiceCount] = useState(0);
  const [waterOz, setWaterOz] = useState(0);
  const [snacked, setSnacked] = useState(false);
  const [snackNote, setSnackNote] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setJuiceCount(existing?.juice_count ?? 0);
    setWaterOz(existing?.water_oz ?? 0);
    setSnacked(existing?.snacked ?? false);
    setSnackNote(existing?.snack_note ?? "");
    setEnergy(existing?.energy_rating ?? null);
    setNotes(existing?.notes ?? "");
  }, [open, existing]);

  const allowsSnacks = session.mode === "juice_plus_light";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Log day {dayNumber}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 pt-4">
          {/* Juices */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Juices today</Label>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setJuiceCount((c) => Math.max(0, c - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[3ch] text-center text-3xl font-bold tabular-nums">{juiceCount}</span>
              <Button variant="outline" size="icon" onClick={() => setJuiceCount((c) => Math.min(20, c + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Named juices and their calories stay in Trainerize — this is just your daily count.
            </p>
          </div>

          {/* Water */}
          <div className="space-y-2">
            <Label htmlFor="juice-water" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Water (oz)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="juice-water"
                type="number"
                min={0}
                inputMode="numeric"
                value={waterOz}
                onChange={(e) => setWaterOz(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="h-10 w-24"
              />
              {[8, 16, 32].map((n) => (
                <Button key={n} variant="outline" size="sm" onClick={() => setWaterOz((w) => w + n)}>
                  +{n}
                </Button>
              ))}
            </div>
          </div>

          {/* Snack */}
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {allowsSnacks ? "Had a snack today" : "Ate solid food"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {allowsSnacks
                    ? "Small snacks are part of this style — just log them."
                    : "This is a juice-only fast. Log it honestly so your coach sees the real picture."}
                </p>
              </div>
              <Switch checked={snacked} onCheckedChange={setSnacked} />
            </div>
            {snacked && (
              <Input
                value={snackNote}
                onChange={(e) => setSnackNote(e.target.value)}
                placeholder="What did you have?"
                className="h-9"
              />
            )}
          </div>

          {/* Energy */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How do you feel?</Label>
            <div className="flex gap-2">
              {ENERGY.map((label, i) => {
                const value = i + 1;
                const active = energy === value;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEnergy(active ? null : value)}
                    className={cn(
                      "flex-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition",
                      active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for your coach (optional)"
            rows={3}
          />

          <Button
            className="w-full"
            size="lg"
            disabled={saving}
            onClick={() =>
              onSave({
                dayNumber,
                juiceCount,
                waterOz,
                snacked,
                snackNote: snackNote || undefined,
                energyRating: energy,
                notes: notes || undefined,
              })
            }
          >
            {saving ? "Saving…" : "Save day"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}