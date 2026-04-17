import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Camera, Heart, Bluetooth, Loader2, Scale } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applySmartPaceWeighIn, type SmartPaceSource } from "@/lib/smartPaceWeighIn";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "choose" | "photo" | "manual_from_photo";

/**
 * Client-facing weigh-in dialog. Only scale-sourced entries are accepted
 * (HealthKit, Bluetooth scale, scale photo). Manual fallback is intentionally
 * absent — those don't count toward Smart Pace.
 */
export function LogWeighInDialog({ clientId, open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [weight, setWeight] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStep("choose");
    setWeight("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const submitMut = useMutation({
    mutationFn: async (source: SmartPaceSource) => {
      const w = parseFloat(weight);
      if (!w || w < 50 || w > 800) throw new Error("Enter a valid weight (50–800 lb)");

      // Upload photo first if scale photo source
      let notes: string | undefined;
      if (source === "ai_photo" && photoFile) {
        const path = `${clientId}/${Date.now()}-scale.jpg`;
        const { error: upErr } = await supabase.storage
          .from("progress-photos")
          .upload(path, photoFile, { upsert: false });
        if (upErr) throw upErr;
        notes = `scale_photo:${path}`;
      }

      const result = await applySmartPaceWeighIn({
        clientId,
        weightLbs: w,
        source,
        notes,
      });

      if (!result.applied) throw new Error(result.reason || "Could not log weigh-in");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Weigh-in logged", description: "Smart Pace updated." });
      qc.invalidateQueries({ queryKey: ["smart-pace"] });
      qc.invalidateQueries({ queryKey: ["smart-pace-log"] });
      close();
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't log weigh-in", description: e.message, variant: "destructive" });
    },
  });

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setStep("manual_from_photo");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log a weigh-in</DialogTitle>
          <DialogDescription>
            Smart Pace only counts scale-sourced weigh-ins.
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-2">
            <SourceOption
              icon={Heart}
              title="Apple Health"
              subtitle="Sync your latest scale weight"
              onClick={() =>
                toast({
                  title: "Open Apple Health sync",
                  description: "Use the Health page to connect & sync your scale.",
                })
              }
            />
            <SourceOption
              icon={Bluetooth}
              title="Bluetooth scale"
              subtitle="Step on your paired scale"
              onClick={() =>
                toast({
                  title: "Step on your scale",
                  description: "Reading will sync automatically when nearby.",
                })
              }
            />
            <SourceOption
              icon={Camera}
              title="Scale photo"
              subtitle="Snap a photo of the readout"
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPickPhoto}
            />
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Manual entries don't count toward Smart Pace. Coach can override in special cases.
            </p>
          </div>
        )}

        {step === "manual_from_photo" && (
          <div className="space-y-3">
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Scale readout"
                className="w-full max-h-56 object-contain rounded-md border"
              />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight from photo (lb)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g. 185.4"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button
                onClick={() => submitMut.mutate("ai_photo")}
                disabled={!weight || submitMut.isPending}
              >
                {submitMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit weigh-in
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SourceOption({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Scale;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-3 cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}
