import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { SessionTimeline } from "@/components/timeline/SessionTimeline";
import { ClientBottomNav } from "@/components/ClientBottomNav";

export default function ClientTimeline() {
  const clientId = useEffectiveClientId();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">Timeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your fasting & eating story.</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {clientId ? (
          <SessionTimeline clientId={clientId} />
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to view your timeline.</p>
        )}
      </main>

      <ClientBottomNav />
    </div>
  );
}