import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SmartPaceTourSheet } from "@/components/smart-pace/SmartPaceTourSheet";

/** Dev-only preview of the Smart Weight Tracker narrated walkthrough. */
export default function SmartPaceTourPreview() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background p-6">
      <Button onClick={() => setOpen(true)}>Open tour</Button>
      <SmartPaceTourSheet open={open} onOpenChange={setOpen} basePaceLbs={0.6} />
    </div>
  );
}
