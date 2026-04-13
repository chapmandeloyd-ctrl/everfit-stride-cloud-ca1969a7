import { RefreshCw, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ActionRow() {
  const navigate = useNavigate();

  const actions = [
    { label: "Sync", icon: RefreshCw, onClick: () => {} },
    { label: "Settings", icon: Settings, onClick: () => navigate("/settings") },
  ];

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <action.icon className="h-4 w-4 text-muted-foreground" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
