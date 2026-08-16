import { useEffect, useState } from "react";
import { FastingTimer } from "@/components/FastingTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import fastingBg from "@/assets/fasting-timer-bg.png";

const PRESETS = [
  { label: "16:8", hours: 16 },
  { label: "18:6", hours: 18 },
  { label: "20:4", hours: 20 },
  { label: "OMAD 23:1", hours: 23 },
  { label: "24h", hours: 24 },
  { label: "36h", hours: 36 },
  { label: "48h", hours: 48 },
  { label: "72h", hours: 72 },
];

export default function FastingRingDemo() {
  const [targetHours, setTargetHours] = useState(18);
  const [elapsed, setElapsed] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // hours per tick

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + speed * 0.25;
        if (next >= targetHours) {
          setPlaying(false);
          return targetHours;
        }
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [playing, speed, targetHours]);

  const progress = Math.min(Math.max(elapsed / targetHours, 0), 1);
  const start = new Date(Date.now() - elapsed * 3600000);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <div>
          <h1 className="text-xl font-bold">Fasting Ring Demo</h1>
          <p className="text-xs text-muted-foreground">
            Pick a protocol and fast-forward elapsed time to see the ring in action.
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-border/60 p-4"
          style={{ background: "black" }}
        >
          <FastingTimer
            fastStartAt={start.toISOString()}
            targetHours={targetHours}
            now={new Date()}
            demoProgress={progress}
            centerImageSrc={fastingBg}
          />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Protocol</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    variant={targetHours === p.hours ? "default" : "outline"}
                    onClick={() => {
                      setTargetHours(p.hours);
                      setElapsed((e) => Math.min(e, p.hours));
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-hours" className="text-xs uppercase tracking-wider">
                Custom target hours
              </Label>
              <Input
                id="custom-hours"
                type="number"
                min={1}
                max={168}
                value={targetHours}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v > 0) setTargetHours(Math.min(v, 168));
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider">Elapsed</Label>
                <span className="text-xs font-semibold tabular-nums">
                  {elapsed.toFixed(1)}h / {targetHours}h ({Math.round(progress * 100)}%)
                </span>
              </div>
              <Slider
                value={[elapsed]}
                min={0}
                max={targetHours}
                step={0.25}
                onValueChange={(v) => setElapsed(v[0])}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button className="flex-1" onClick={() => setPlaying((p) => !p)}>
                {playing ? "Pause" : "Fast-forward"}
              </Button>
              <Button variant="outline" onClick={() => { setPlaying(false); setElapsed(0); }}>
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={() => setSpeed((s) => (s === 1 ? 3 : s === 3 ? 6 : 1))}
              >
                {speed}x
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => (window.location.href = "/dev/fast-complete-demo")}
            >
              Finish fast → see Fast Complete screen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
