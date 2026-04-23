import { Lock, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LockProgress } from "@/components/LockProgress";
import type { ReactNode } from "react";

interface LockedPlanPopoverProps {
  /** Trigger element (the lock icon / badge). Must be a single element. */
  children: ReactNode;
  /** Short explanation of why this card is locked. */
  message: string;
  /** Optional override for the CTA route. Defaults to /client/messages. */
  ctaPath?: string;
  /** Optional override for the CTA label. */
  ctaLabel?: string;
  /** Tooltip side. Defaults to "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** Name of the locked plan — used to pre-fill the message composer. */
  planName?: string;
  /** Optional unlock progress (e.g. current level vs required). */
  progress?: {
    current: number;
    required: number;
    label?: string;
  };
}

/**
 * Reusable popover shown when a user taps a locked card's lock icon.
 * Explains the unlock requirement and provides a "Message to unlock" CTA
 * that takes the client straight to their trainer chat.
 */
export function LockedPlanPopover({
  children,
  message,
  ctaPath = "/client/messages",
  ctaLabel = "Message to unlock",
  side = "top",
  planName,
  progress,
}: LockedPlanPopoverProps) {
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="end"
        className="w-64 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Locked
            </p>
            <p className="text-xs leading-relaxed">{message}</p>
          </div>
        </div>
        {progress && (
          <div className="mb-3">
            <LockProgress
              current={progress.current}
              required={progress.required}
              label={progress.label}
            />
          </div>
        )}
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            navigate(ctaPath, {
              state: {
                prefillMessage: planName
                  ? `Hi! I'd like to unlock "${planName}". ${message} Can you help me get access?`
                  : `Hi! I'd like to unlock this plan. ${message} Can you help me get access?`,
                lockedPlanName: planName ?? null,
                lockedPlanReason: message,
              },
            });
          }}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {ctaLabel}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
