import { CalendarDays, Compass } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Today", to: "/client/dashboard", icon: CalendarDays },
  { label: "Explore", to: "/client/explore", icon: Compass },
];

export function ClientBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2px)' }}>
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
