import { useOutletContext } from "react-router-dom";
import type { Profile } from "@/hooks/useAuth";
import {
  User,
  MessageSquare,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Heart,
  Scale,
  Utensils,
  Wind,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ClientContext {
  profile: Profile;
  onSignOut: () => void;
}

const menuSections = [
  {
    title: "Training",
    items: [
      { label: "Workouts", icon: Heart, path: "/workouts" },
      { label: "Nutrition", icon: Utensils, path: "/nutrition" },
      { label: "Recovery", icon: Wind, path: "/recovery" },
      { label: "Body Metrics", icon: Scale, path: "/progress" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Messages", icon: MessageSquare, path: "/messages" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

export default function ProfilePage() {
  const { profile, onSignOut } = useOutletContext<ClientContext>();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg font-heading">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold font-heading truncate">{profile.full_name || "User"}</h2>
          <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
        </div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
          <span className="text-sm font-medium">{isDark ? "Dark Mode" : "Light Mode"}</span>
        </div>
        <div className={`h-6 w-11 rounded-full transition-colors flex items-center px-0.5 ${isDark ? "bg-primary justify-end" : "bg-muted justify-start"}`}>
          <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
        </div>
      </button>

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <section key={section.title} className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
            {section.title}
          </p>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-sm font-semibold">Sign Out</span>
      </button>
    </div>
  );
}
