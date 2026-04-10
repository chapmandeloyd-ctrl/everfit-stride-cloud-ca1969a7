import { RefreshCw } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useAppUpdate();

  if (!updateAvailable) return null;

  return (
    <button
      onClick={applyUpdate}
      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-primary-foreground bg-primary animate-in slide-in-from-top-2 duration-300 z-[60]"
    >
      <RefreshCw className="h-4 w-4" />
      New update available — tap to refresh
    </button>
  );
}
