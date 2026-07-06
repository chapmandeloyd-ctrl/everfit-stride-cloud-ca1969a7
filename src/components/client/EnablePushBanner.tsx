import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import {
  getPushPermissionStatus,
  getPushSetupMessage,
  getVapidPublicKey,
  isIOSDevice,
  isPushSupported,
  isStandalonePWA,
  savePushSubscription,
  subscribeToPush,
} from "@/lib/pushNotifications";
import { toast } from "sonner";
import { IOSInstallGuideDialog } from "./IOSInstallGuideDialog";

/**
 * Small banner that appears above the fasting card when the client has no
 * push subscription registered. Without a subscription, the server-side
 * auto-start heads-up ("Fast starts in 5 min — CANCEL") and the
 * "Fast started" confirmation can't reach the device.
 */
export function EnablePushBanner() {
  const { user } = useAuth();
  const clientId = useEffectiveClientId();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("enable_push_banner_dismissed") === "1";
  });
  const [enabling, setEnabling] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const { data: subCount } = useQuery({
    queryKey: ["push-sub-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const supported = isPushSupported();
  const permission = supported ? getPushPermissionStatus() : "unsupported";

  if (!clientId || !user?.id || dismissed) return null;
  if (clientId !== user.id) return null;
  if (!supported) return null;
  if (permission === "denied") return null;
  if ((subCount ?? 0) > 0) return null;

  const handleEnable = async () => {
    setEnabling(true);
    try {
      // iOS Safari only supports Web Push when the site is installed to the
      // Home Screen (standalone display mode). Detect and explain.
      const isIOS = isIOSDevice();
      const isStandalone = isStandalonePWA();
      if (isIOS && !isStandalone) {
        setShowInstallGuide(true);
        return;
      }

      // Must request permission explicitly — pushManager.subscribe() will
      // otherwise reject silently on Safari/iOS.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error(
          perm === "denied"
            ? "Notifications are blocked. Enable them in your device Settings → Notifications → KSOM-360."
            : "Notification permission was not granted."
        );
        return;
      }

      const vapid = await getVapidPublicKey();
      if (!vapid) throw new Error("Push not configured");
      const sub = await subscribeToPush(vapid);
      if (!sub) throw new Error(getPushSetupMessage());
      const ok = await savePushSubscription(user.id, sub);
      if (!ok) throw new Error("Couldn't save subscription");
      toast.success("Push notifications on. You'll get a heads-up when your fast is about to start.");
      qc.invalidateQueries({ queryKey: ["push-sub-count", user.id] });
    } catch (e: any) {
      toast.error(e?.message ?? getPushSetupMessage(e));
    } finally {
      setEnabling(false);
    }
  };

  return (
    <>
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white leading-tight">Turn on push notifications</p>
        <p className="text-[11px] text-white/70 leading-snug mt-0.5">
          So you get a 5-min heads-up before every scheduled fast — and can tap CANCEL if you're still eating.
        </p>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={enabling}
        className="shrink-0 rounded-md bg-primary px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {enabling ? "…" : "Enable"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") window.localStorage.setItem("enable_push_banner_dismissed", "1");
          setDismissed(true);
        }}
        className="shrink-0 rounded-md p-1.5 text-white/60 hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
    <IOSInstallGuideDialog open={showInstallGuide} onOpenChange={setShowInstallGuide} />
    </>
  );
}