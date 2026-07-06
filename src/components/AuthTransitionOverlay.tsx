import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

const FLAG = "authTransition";

export function startAuthTransition() {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {}
  window.dispatchEvent(new Event("auth-transition-start"));
}

export default function AuthTransitionOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(FLAG) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onStart = () => setVisible(true);
    window.addEventListener("auth-transition-start", onStart);
    return () => window.removeEventListener("auth-transition-start", onStart);
  }, []);

  // When we've landed on a post-auth route, hold briefly then fade out.
  useEffect(() => {
    if (!visible) return;
    if (location.pathname === "/auth") return;
    const hide = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.removeItem(FLAG);
      } catch {}
    }, 900);
    // Hard ceiling in case navigation stalls
    const hard = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.removeItem(FLAG);
      } catch {}
    }, 6000);
    return () => {
      clearTimeout(hide);
      clearTimeout(hard);
    };
  }, [visible, location.pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <img
        src="/logo.png"
        alt=""
        className="h-20 w-20 object-contain animate-pulse"
      />
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your dashboard…
      </div>
    </div>
  );
}