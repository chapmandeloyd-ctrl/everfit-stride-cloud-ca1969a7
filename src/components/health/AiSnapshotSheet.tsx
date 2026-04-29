import { useRef, useState } from "react";
import { Camera, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AiSnapshotSheet({ open, onOpenChange, clientId }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const reset = () => {
    setPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);
    } catch {
      toast.error("Couldn't read image");
    }
  };

  const handleAnalyze = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-health-screenshot", {
        body: { image: preview.includes(",") ? preview.split(",")[1] : preview, clientId },
      });
      if (error) throw error;

      const count = data?.metrics?.length ?? 0;
      toast.success(
        count > 0
          ? `Imported ${count} metric${count === 1 ? "" : "s"} from your screenshot`
          : "Snapshot processed",
      );
      queryClient.invalidateQueries({ queryKey: ["health-activity-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["health-activity-metrics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["activity-summary"] });
      queryClient.invalidateQueries({ queryKey: ["weight-entries"] });
      queryClient.invalidateQueries({ queryKey: ["latest-weight-minimal"] });
      // StepTrackerCard / useHealthStats / useHealthData read from health_data
      // table — invalidate them so the snapshot's mirrored values appear immediately.
      queryClient.invalidateQueries({ queryKey: ["health-stats"] });
      queryClient.invalidateQueries({ queryKey: ["health-data"] });
      queryClient.invalidateQueries({ queryKey: ["session-timeline-events"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error("[AiSnapshot] error:", err);
      toast.error(err?.message || "Failed to analyze screenshot");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            AI Snapshot
          </SheetTitle>
          <SheetDescription>
            Snap or upload a screenshot from Trainerize, Apple Health, Fitbit, Garmin, Whoop —
            any tracker. We'll auto-fill your Body Weight, Steps, Sleep, Caloric Burn, and Caloric Intake.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border bg-muted">
              <img src={preview} alt="Health screenshot preview" className="w-full max-h-80 object-contain" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={reset}
                disabled={submitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 hover:bg-muted transition-colors"
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Take photo</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 hover:bg-muted transition-colors"
              >
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">Choose from library</span>
              </button>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!preview || submitting}
            onClick={handleAnalyze}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Analyze screenshot
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
