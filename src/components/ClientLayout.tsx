import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Play, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/hooks/useAuth";

interface ClientLayoutProps {
  profile: Profile;
  onSignOut: () => void;
}

const tabs = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Plans", icon: LayoutGrid, path: "/plans" },
  { label: "On-Demand", icon: Play, path: "/on-demand" },
  { label: "Progress", icon: BarChart3, path: "/progress" },
  { label: "Profile", icon: User, path: "/profile" },
];

export function ClientLayout({ profile, onSignOut }: ClientLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main content area */}
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet context={{ profile, onSignOut }} />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path ||
              (tab.path !== "/" && location.pathname.startsWith(tab.path));
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <tab.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
