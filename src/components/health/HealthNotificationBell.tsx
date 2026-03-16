import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HealthNotificationBell() {
  return (
    <Button variant="ghost" size="icon" aria-label="Health notifications">
      <Bell className="h-4 w-4" />
    </Button>
  );
}
