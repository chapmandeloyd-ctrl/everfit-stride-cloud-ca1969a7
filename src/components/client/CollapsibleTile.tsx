import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  title: string;
  summary: ReactNode;
  statusPill?: { label: string; tone?: "default" | "success" | "warning" | "danger" | "info" };
  iconTone?: "primary" | "success" | "warning" | "danger" | "info" | "muted";
  defaultOpen?: boolean;
  storageKey?: string;
  children: ReactNode;
}

const ICON_TONE: Record<NonNullable<Props["iconTone"]>, { bg: string; fg: string }> = {
  primary: { bg: "bg-primary/10", fg: "text-primary" },
  success: { bg: "bg-emerald-500/10", fg: "text-emerald-500" },
  warning: { bg: "bg-amber-500/15", fg: "text-amber-500" },
  danger: { bg: "bg-destructive/10", fg: "text-destructive" },
  info: { bg: "bg-sky-500/10", fg: "text-sky-500" },
  muted: { bg: "bg-muted/60", fg: "text-muted-foreground" },
};

const PILL_TONE: Record<NonNullable<NonNullable<Props["statusPill"]>["tone"]>, string> = {
  default: "bg-muted text-muted-foreground ring-border",
  success: "bg-emerald-500/15 text-emerald-500 ring-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-500 ring-amber-500/30",
  danger: "bg-destructive/15 text-destructive ring-destructive/30",
  info: "bg-sky-500/15 text-sky-500 ring-sky-500/30",
};

/**
 * Compact collapsible dashboard tile — mirrors the Weight Tracker pill layout.
 * Collapsed: icon | title (+ optional pill) | one-line summary | chevron.
 * Expanded: children rendered below the same header.
 * Persists expanded state per `storageKey` in localStorage.
 */
export function CollapsibleTile({
  icon: Icon,
  title,
  summary,
  statusPill,
  iconTone = "primary",
  defaultOpen = false,
  storageKey,
  children,
}: Props) {
  const [open, setOpen] = useState(() => {
    if (!storageKey) return defaultOpen;
    try {
      const v = localStorage.getItem(`tile-open:${storageKey}`);
      return v == null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  });
  const tone = ICON_TONE[iconTone];

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          localStorage.setItem(`tile-open:${storageKey}`, next ? "1" : "0");
        } catch {
          /* noop */
        }
      }
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3 text-left transition hover:bg-muted/30 active:scale-[0.995]"
      >
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.bg)}>
          <Icon className={cn("h-5 w-5", tone.fg)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-foreground truncate">
              {title}
            </span>
            {statusPill && (
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 ring-1 shrink-0",
                  PILL_TONE[statusPill.tone ?? "default"]
                )}
              >
                {statusPill.label}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{summary}</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border/60 p-3">{children}</div>}
    </div>
  );
}