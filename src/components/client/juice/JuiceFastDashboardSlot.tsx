import type { ReactNode } from "react";
import { ActiveJuiceFastCard } from "./ActiveJuiceFastCard";
import { useJuiceFast } from "@/hooks/useJuiceFast";

interface Props {
  centerImageSrc: string;
  /** The normal fasting UI — hidden while a juice fast is running. */
  children: ReactNode;
}

/**
 * Swaps the dashboard's regular fasting card for the juice fast day counter
 * while a juice fast is active, so there is never more than one hero ring.
 */
export function JuiceFastDashboardSlot({ centerImageSrc, children }: Props) {
  const { session } = useJuiceFast();

  if (session) {
    return (
      <div className="space-y-3">
        <h2 className="px-1 text-lg font-bold text-foreground">APEXBEAST-IF Juice Fast</h2>
        <ActiveJuiceFastCard centerImageSrc={centerImageSrc} />
      </div>
    );
  }

  return <>{children}</>;
}