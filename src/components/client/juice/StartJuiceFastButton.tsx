import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CupSoda } from "lucide-react";
import { StartJuiceFastSheet } from "./StartJuiceFastSheet";
import { useJuiceFast } from "@/hooks/useJuiceFast";
import { useAuth } from "@/hooks/useAuth";

/**
 * Slim dashboard entry point for juice fasting.
 * Hidden while a juice fast is already running (the hero swaps in that case).
 */
export function StartJuiceFastButton() {
  const { session, startFast } = useJuiceFast();
  const { userRole } = useAuth();
  const [open, setOpen] = useState(false);

  if (session) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full h-12 rounded-xl text-sm font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
      >
        <CupSoda className="mr-2 h-4 w-4" />
        Start a juice fast
      </Button>

      <StartJuiceFastSheet
        open={open}
        onOpenChange={setOpen}
        isTrainer={userRole === "trainer"}
        starting={startFast.isPending}
        onStart={(input) => startFast.mutate(input, { onSuccess: () => setOpen(false) })}
      />
    </>
  );
}
