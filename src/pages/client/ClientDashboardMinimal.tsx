import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { WaterTrackerCard } from "@/components/client/WaterTrackerCard";

export default function ClientDashboardMinimal() {
  const clientId = useEffectiveClientId();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Hydration tracking is ready.</p>
        </header>

        {clientId && <WaterTrackerCard />}

        {!clientId && (
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        )}
      </div>
    </main>
  );
}