import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  MessageSquare,
  UtensilsCrossed,
  BarChart3,
  Settings,
  LogOut,
  Heart,
  Wind,
  Target,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/hooks/useAuth";

interface AppSidebarProps {
  profile: Profile;
  onSignOut: () => void;
}

const trainerNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Clients", icon: Users, path: "/clients" },
  { label: "Workouts", icon: Dumbbell, path: "/workouts" },
  { label: "Programs", icon: Calendar, path: "/programs" },
  { label: "Exercises", icon: Target, path: "/exercises" },
  { label: "Meal Plans", icon: UtensilsCrossed, path: "/meal-plans" },
  { label: "Messages", icon: MessageSquare, path: "/messages" },
  { label: "Resources", icon: FileText, path: "/resources" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
];

const clientNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Workouts", icon: Dumbbell, path: "/workouts" },
  { label: "Nutrition", icon: UtensilsCrossed, path: "/nutrition" },
  { label: "Progress", icon: BarChart3, path: "/progress" },
  { label: "Recovery", icon: Heart, path: "/recovery" },
  { label: "Breathing", icon: Wind, path: "/breathing" },
  { label: "Messages", icon: MessageSquare, path: "/messages" },
];

export function AppSidebar({ profile, onSignOut }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = profile.role === "trainer" ? trainerNav : clientNav;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-sidebar-background text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Dumbbell className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          KSOM360
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">
            {profile.full_name?.[0] || profile.email[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name || "User"}</p>
            <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
          </div>
          <button
            onClick={onSignOut}
            className="shrink-0 rounded-md p-1.5 text-sidebar-muted hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
