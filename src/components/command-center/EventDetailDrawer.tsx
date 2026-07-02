import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import {
  CalendarClock,
  CircleDot,
  Flag,
  Flame,
  Utensils,
  History,
  ArrowRight,
  Undo2,
  Check,
  CalendarPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type CalendarEventDetail = {
  date: Date;
  type: "checkin" | "review";
  label: string;
  sourceId?: string;
  sourceKind?: "recurring" | "homework" | "review";
  frequency?: string | null;
};

export function EventDetailDrawer({
  clientId,
  event,
  open,
  onOpenChange,
  onComplete,
  onReschedule,
  completing,
  rescheduling,
}: {
  clientId: string;
  event: CalendarEventDetail | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onComplete: (e: CalendarEventDetail) => void;
  onReschedule?: (e: CalendarEventDetail, newDate: Date) => void;
  completing?: boolean;
  rescheduling?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const canReschedule = event?.sourceKind === "recurring" || event?.sourceKind === "homework";

  const { data: protocol } = useQuery({
    queryKey: ["event-drawer-protocol", clientId],
    enabled: open && !!clientId,
    queryFn: async () => {
      const [{ data: keto }, { data: settings }] = await Promise.all([
        supabase
          .from("client_keto_assignments")
          .select("keto_type:keto_types(name, code)")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("client_feature_settings")
          .select("selected_protocol_id, protocol_start_date, assigned_protocol_duration_days")
          .eq("client_id", clientId)
          .maybeSingle(),
      ]);
      let proto: any = null;
      const pid = (settings as any)?.selected_protocol_id;
      if (pid) {
        const { data: p } = await supabase
          .from("fasting_protocols")
          .select("name, fasting_hours, eating_hours")
          .eq("id", pid)
          .maybeSingle();
        proto = p;
      }
      return {
        ketoName: (keto as any)?.keto_type?.code || (keto as any)?.keto_type?.name || null,
        protocol: proto,
        startDate: (settings as any)?.protocol_start_date || null,
        durationDays: (settings as any)?.assigned_protocol_duration_days || null,
      };
    },
  });

  const { data: history } = useQuery({
    queryKey: ["event-drawer-history", clientId],
    enabled: open && !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("protocol_assignment_history" as any) as any)
        .select("id, created_at, protocol_name, previous_protocol_name, source")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        protocol_name: string | null;
        previous_protocol_name: string | null;
        source: string;
      }>;
    },
  });

  const fastLabel = protocol?.protocol
    ? protocol.protocol.fasting_hours && protocol.protocol.eating_hours
      ? `${protocol.protocol.fasting_hours}:${protocol.protocol.eating_hours}`
      : protocol.protocol.name
    : null;

  const isReview = event?.sourceKind === "review";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] sm:h-auto sm:max-h-[92vh] w-full sm:max-w-md sm:side-right overflow-y-auto rounded-t-2xl sm:rounded-none px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            {isReview ? (
              <Flag className="h-4 w-4 text-amber-500" />
            ) : (
              <CircleDot className="h-4 w-4 text-primary" />
            )}
            <SheetTitle className="text-base">{event?.label ?? "Event"}</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            {event?.date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Event summary */}
          <div className="rounded-lg border border-border/60 bg-card/50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {isReview
                  ? "Protocol review"
                  : event?.sourceKind === "recurring"
                  ? "Recurring check-in"
                  : "Homework check-in"}
              </Badge>
              {event?.frequency && (
                <Badge variant="outline" className="text-[10px] capitalize">
                  {event.frequency}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-muted-foreground text-xs">
              {isReview
                ? "Review adherence, weight change, and macros. Completing renews the protocol cycle."
                : event?.sourceKind === "recurring"
                ? "Recurring client check-in. Completing schedules the next occurrence."
                : "One-off homework check-in assigned to the client."}
            </p>
          </div>

          {/* Assigned protocol */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Assigned Protocol
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-wrap items-center gap-2">
              {protocol?.ketoName && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Utensils className="h-3 w-3" />
                  {protocol.ketoName}
                </Badge>
              )}
              {fastLabel && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Flame className="h-3 w-3" />
                  {fastLabel}
                  {protocol?.protocol?.name && fastLabel !== protocol.protocol.name && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      · {protocol.protocol.name}
                    </span>
                  )}
                </Badge>
              )}
              {!protocol?.ketoName && !fastLabel && (
                <span className="text-xs text-muted-foreground">No protocol assigned</span>
              )}
            </div>
            {protocol?.startDate && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Started {new Date(protocol.startDate).toLocaleDateString()}
                {protocol.durationDays ? ` · ${protocol.durationDays}-day cycle` : ""}
              </p>
            )}
          </div>

          <Separator />

          {/* History */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <History className="h-3.5 w-3.5 text-primary" />
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Recent Protocol History
              </div>
            </div>
            {!history || history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No prior assignments recorded.</p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => {
                  const isUndo = h.source === "undo";
                  return (
                    <li
                      key={h.id}
                      className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs"
                    >
                      <div
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${
                          isUndo ? "bg-amber-500/15 text-amber-500" : "bg-primary/15 text-primary"
                        }`}
                      >
                        {isUndo ? <Undo2 className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                            {h.previous_protocol_name || "None"}
                          </span>
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="font-medium">{h.protocol_name || "None"}</span>
                          {isUndo && (
                            <Badge
                              variant="outline"
                              className="ml-1 h-4 border-amber-500/40 text-amber-500 text-[9px] px-1"
                            >
                              Undo
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Complete action */}
          {event && (
            <div className="pt-2 space-y-2">
              {canReschedule && onReschedule && (
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={rescheduling}
                    >
                      <CalendarPlus className="h-4 w-4" />
                      {rescheduling ? "Rescheduling…" : "Reschedule"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[calc(100vw-2rem)] sm:w-auto max-w-sm p-0"
                    align="center"
                    side="top"
                  >
                    <DatePicker
                      mode="single"
                      selected={event.date}
                      onSelect={(d) => {
                        if (!d) return;
                        setPickerOpen(false);
                        onReschedule(event, d);
                      }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
              <Button
                className="w-full gap-2"
                onClick={() => onComplete(event)}
                disabled={completing}
              >
                <Check className="h-4 w-4" />
                {completing
                  ? "Saving…"
                  : isReview
                  ? "Mark review complete & renew cycle"
                  : "Mark completed"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}