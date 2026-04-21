import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardCardLayoutEditor } from "@/components/DashboardCardLayoutEditor";

/**
 * Trainer-wide default dashboard layout editor.
 * Edits the row in dashboard_card_layouts where client_id IS NULL — the
 * fallback layout that every new client receives until they get their own override.
 */
export function DefaultDashboardLayoutEditor() {
  const { user } = useAuth();
  const trainerId = user?.id;

  const { cards, isLoading, save, isSaving } = useDashboardLayout(trainerId, null);

  if (!trainerId || isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          Default Home Screen for New Clients
        </CardTitle>
        <CardDescription>
          This is the layout every new client sees until you customize their individual dashboard.
          Drag to reorder and toggle cards on/off, then save.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <DashboardCardLayoutEditor
          cards={cards}
          onSave={(newCards) => save({ cards: newCards, forClient: null })}
          isSaving={isSaving}
          clientName="New Client"
        />
      </CardContent>
    </Card>
  );
}