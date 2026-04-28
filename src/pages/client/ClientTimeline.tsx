import { useAuth } from "@/hooks/useAuth";
import { ActivityTimeline } from "@/components/timeline/ActivityTimeline";
import { ClientBottomNav } from "@/components/ClientBottomNav";

export default function ClientTimeline() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">Timeline</h1>
          <p className="text-xs text-muted-foreground mt-0.5">A live record of everything you do.</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {user?.id ? (
          <ActivityTimeline clientId={user.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to view your timeline.</p>
        )}
      </main>

      <ClientBottomNav />
    </div>
  );
}