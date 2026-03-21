import { Bell, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Profile } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

interface ClientHeaderProps {
  profile: Profile;
  engineMode?: string;
  level?: number;
  greeting?: string;
  subtitle?: string;
  emoji?: string;
}

export function ClientHeader({
  profile,
  engineMode = "Performance Readiness",
  level = 1,
  greeting,
  subtitle = "Let's do this",
  emoji = "👋",
}: ClientHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const firstName = profile.full_name?.split(" ")[0] || "Athlete";
  const today = new Date();

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center">
          <span className="text-background text-xs font-bold font-heading">K</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      {/* Date + Engine badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {format(today, "EEEE, MMM d")}
        </p>
        <Badge
          variant="secondary"
          className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border-0 px-2.5 py-1"
        >
          {engineMode} Engine • L{level}
        </Badge>
      </div>

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            {greeting || `Hello, ${firstName}!`} {emoji}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
