import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";

/** Only this account can toggle light/dark. Everyone else sees the app in dark mode only. */
const OWNER_EMAIL = "ksomfast@yahoo.com";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();

  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

  // Force dark mode for everyone except the owner, and also force dark while
  // the owner is previewing as a client so the preview matches what clients see.
  useEffect(() => {
    if ((!isOwner || isImpersonating) && theme !== "dark") {
      setTheme("dark");
    }
  }, [isOwner, isImpersonating, theme, setTheme]);

  // Hide the toggle from everyone except the owner. The app is dark-mode only for users.
  // Also hide it while previewing as a client, so the preview always reflects the real client UI.
  if (!isOwner || isImpersonating) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
