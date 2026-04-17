import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, BarChart3, Target, CheckSquare, Activity } from "lucide-react";
import { ClientMetricsTab } from "./ClientMetricsTab";
import { AdminGoalsTab } from "./AdminGoalsTab";
import { ClientTasksTab } from "./ClientTasksTab";
import { SmartPaceTrainerCard } from "@/components/smart-pace/SmartPaceTrainerCard";

interface GroupedProgressTabProps {
  clientId: string;
  trainerId: string;
  clientName?: string;
}

const sections = [
  { key: "smart_pace", label: "Smart Pace Tracker", icon: Activity },
  { key: "metrics", label: "Body Metrics", icon: BarChart3 },
  { key: "goals", label: "Goals (Legacy)", icon: Target },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
] as const;

export function GroupedProgressTab({ clientId, trainerId, clientName }: GroupedProgressTabProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    smart_pace: true,
    metrics: false,
    goals: false,
    tasks: false,
  });

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, icon: Icon }) => (
        <Collapsible key={key} open={openSections[key]} onOpenChange={() => toggle(key)}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm flex-1 text-left">{label}</span>
            {openSections[key] ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {key === "smart_pace" && <SmartPaceTrainerCard clientId={clientId} trainerId={trainerId} />}
            {key === "metrics" && <ClientMetricsTab clientId={clientId} trainerId={trainerId} />}
            {key === "goals" && <AdminGoalsTab clientId={clientId} trainerId={trainerId} clientName={clientName} />}
            {key === "tasks" && <ClientTasksTab clientId={clientId} trainerId={trainerId} />}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
