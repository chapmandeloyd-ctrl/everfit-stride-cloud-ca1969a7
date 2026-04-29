import { useState } from "react";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ActivityTimeline } from "@/components/timeline/ActivityTimeline";
import { SessionTimeline } from "@/components/timeline/SessionTimeline";
import { ClientBottomNav } from "@/components/ClientBottomNav";
import { cn } from "@/lib/utils";

type View = "sessions" | "events";

export default function ClientTimeline() {
  const clientId = useEffectiveClientId();
  const [view, setView] = useState<View>("sessions");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">Timeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your fasting & eating story.</p>
          <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-0.5">
            {([
              { v: "sessions", label: "Sessions" },
              { v: "events", label: "All events" },
            ] as const).map((tab) => (
              <button
                key={tab.v}
                onClick={() => setView(tab.v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  view === tab.v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {clientId ? (
          view === "sessions" ? (
            <SessionTimeline clientId={clientId} />
          ) : (
            <ActivityTimeline clientId={clientId} />
          )
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to view your timeline.</p>
        )}
      </main>

      <ClientBottomNav />
    </div>
  );
}