import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share, Plus, Home, Bell } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * iOS Safari requires the site to be installed to the Home Screen
 * (standalone display mode) before Web Push permission can be requested.
 * This dialog walks the user through the 4-step process.
 */
export function IOSInstallGuideDialog({ open, onOpenChange }: Props) {
  const steps = [
    {
      icon: Share,
      title: "Tap the Share icon",
      body: "At the bottom of Safari, tap the square with an up-arrow.",
    },
    {
      icon: Plus,
      title: 'Choose "Add to Home Screen"',
      body: "Scroll down in the share menu until you see it, then tap.",
    },
    {
      icon: Home,
      title: 'Tap "Add"',
      body: "The APEX360-IF icon appears on your Home Screen.",
    },
    {
      icon: Bell,
      title: "Open from the Home Screen icon",
      body: 'Come back here, tap "Enable" again, and choose Allow when iOS asks.',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Install APEX360-IF to enable alerts</DialogTitle>
          <DialogDescription>
            iPhone only allows push notifications when the app is on your Home Screen.
            It takes about 15 seconds.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 mt-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{step.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-2 rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
          Not seeing the Share icon? Make sure you're using <strong>Safari</strong> — Chrome
          and other iPhone browsers can't install apps to the Home Screen.
        </p>
      </DialogContent>
    </Dialog>
  );
}