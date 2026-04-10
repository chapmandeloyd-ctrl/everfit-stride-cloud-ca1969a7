import { Home, BarChart3, User, MonitorPlay, FlaskConical } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useClientFeatureSettings } from "@/hooks/useClientFeatureSettings";
import { useEngineMode } from "@/hooks/useEngineMode";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

const baseItems: NavItem[] = [
  { label: "Home", to: "/client/dashboard", icon: Home },
  { label: "Progress", to: "/client/progress", icon: BarChart3 },
  { label: "Profile", to: "/client/profile", icon: User },
];

const onDemandItem: NavItem = {
  label: "On-Demand",
  to: "/client/on-demand",
  icon: MonitorPlay,
};

const labsItem: NavItem = {
  label: "Labs",
  to: "/client/labs",
  icon: FlaskConical,
};

export function ClientBottomNav() {
  const { settings } = useClientFeatureSettings();
  const { engineMode } = useEngineMode();
  const onDemandEnabled = (settings as any)?.on_demand_enabled !== false;
  const isAthleticEngine = engineMode === "athletic";

  // Athletic engine users get a Labs tab; others get On-Demand if enabled
  let navItems: NavItem[];
  if (isAthleticEngine) {
    navItems = [baseItems[0], labsItem, baseItems[1], baseItems[2]];
  } else if (onDemandEnabled) {
    navItems = [baseItems[0], onDemandItem, baseItems[1], baseItems[2]];
  } else {
    navItems = baseItems;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-colors",
                isActive && "text-primary"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}