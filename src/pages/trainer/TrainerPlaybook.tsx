import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Save, Pill, Sunrise, Moon as MoonIcon, Eye } from "lucide-react";
import { useSupplements, useTrainerSchedule } from "@/hooks/useTrainerPlaybook";
import { KETO_TYPE_LIST, KETO_TYPES, type KetoTypeCode } from "@/lib/ketoTypes";
import { toast } from "sonner";
import { PLAYBOOK_STEP_TYPE_LIST, getStepTypeMeta } from "@/lib/playbookStepTypes";

function useProtocolOptions() {
  return useQuery({
    queryKey: ["trainer-playbook-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("id, name, description, category, difficulty_level, fast_target_hours")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

const DAY_LABELS = [
  { i: 0, label: "Sun" },
  { i: 1, label: "Mon" },
  { i: 2, label: "Tue" },
  { i: 3, label: "Wed" },
  { i: 4, label: "Thu" },
  { i: 5, label: "Fri" },
  { i: 6, label: "Sat" },
];

const TRIGGER_OPTIONS = [
  { v: "__abs__", label: "Specific time" },
  { v: "wakeup", label: "Wake-up" },
  { v: "sleep", label: "Sleep" },
  { v: "pre_workout", label: "Pre-workout" },
  { v: "post_workout", label: "Post-workout" },
  { v: "window_open", label: "Window opens" },
  { v: "window_close", label: "Window closes" },
];

export default function TrainerPlaybook() {
  return (
    <DashboardLayout>
      <div className="px-4 py-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocol Playbook</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build the daily playbook: active days, keto type per day, timed coaching, and supplements.
          </p>
        </div>

        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">Protocol Schedule</TabsTrigger>
            <TabsTrigger value="supplements">Supplements Library</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="mt-4">
            <ScheduleEditor />
          </TabsContent>
          <TabsContent value="supplements" className="mt-4">
            <SupplementsEditor />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ScheduleEditor() {
  const { data: protocolOptions = [] } = useProtocolOptions();
  const [protocolId, setProtocolId] = useState<string>("");
  const effectiveId = protocolId || protocolOptions[0]?.id || "";
  const { schedule, overrides, items, upsertSchedule, setOverride, upsertItem, deleteItem } =
    useTrainerSchedule(effectiveId);

  const ensure = async (patch: any) => {
    await upsertSchedule.mutateAsync({ ...schedule, ...patch });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Protocol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={effectiveId} onValueChange={setProtocolId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {protocolOptions.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex flex-col py-0.5">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground line-clamp-2 max-w-[420px]">
                      {p.fast_target_hours ? `${p.fast_target_hours}h fast · ` : ""}
                      {p.difficulty_level ? `${p.difficulty_level} · ` : ""}
                      {p.description ?? ""}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(() => {
            const p = protocolOptions.find((x: any) => x.id === effectiveId) as any;
            if (!p) return null;
            return (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {p.category && (
                    <span className="rounded-full bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {p.category}
                    </span>
                  )}
                  {p.fast_target_hours && (
                    <span className="rounded-full bg-muted text-foreground/80 border border-border px-2 py-0.5 text-[10px] font-semibold">
                      {p.fast_target_hours}h fast
                    </span>
                  )}
                  {p.difficulty_level && (
                    <span className="rounded-full bg-muted text-foreground/80 border border-border px-2 py-0.5 text-[10px] font-semibold capitalize">
                      {p.difficulty_level}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((d) => {
              const active = (schedule?.active_days ?? [0,1,2,3,4,5,6]).includes(d.i);
              return (
                <button
                  key={d.i}
                  onClick={() => {
                    const cur = schedule?.active_days ?? [0,1,2,3,4,5,6];
                    const next = active ? cur.filter((x) => x !== d.i) : [...cur, d.i].sort();
                    ensure({ active_days: next });
                  }}
                  className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keto Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
            <div>
              <div className="font-medium text-sm">Same type every day (Simple)</div>
              <div className="text-xs text-muted-foreground">Off = set different keto types per weekday</div>
            </div>
            <Switch
              checked={(schedule?.keto_mode ?? "simple") === "simple"}
              onCheckedChange={(checked) => ensure({ keto_mode: checked ? "simple" : "advanced" })}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">Default keto type</Label>
            <Select
              value={schedule?.default_keto_type ?? ""}
              onValueChange={(v) => ensure({ default_keto_type: v as KetoTypeCode })}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select keto type…" /></SelectTrigger>
              <SelectContent>
                {KETO_TYPE_LIST.map((k) => (
                  <SelectItem key={k.code} value={k.code}>{k.code} — {k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(schedule?.keto_mode === "advanced") && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Per-day overrides</Label>
              {DAY_LABELS.map((d) => {
                const ov = overrides.find((o: any) => o.weekday === d.i);
                return (
                  <div key={d.i} className="flex items-center gap-3">
                    <div className="w-12 text-sm font-semibold">{d.label}</div>
                    <Select
                      value={ov?.keto_type ?? "__default__"}
                      onValueChange={(v) =>
                        setOverride.mutate({
                          weekday: d.i,
                          keto_type: v === "__default__" ? null : (v as KetoTypeCode),
                        })
                      }
                    >
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Use default ({schedule?.default_keto_type ?? "—"})</SelectItem>
                        {KETO_TYPE_LIST.map((k) => (
                          <SelectItem key={k.code} value={k.code}>{k.code} — {k.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daily Timeline</CardTitle>
          <Button
            size="sm"
            disabled={!schedule}
            onClick={() =>
              upsertItem.mutate({
                order_index: items.length,
                label: "New step",
                step_type: "coaching",
                time_of_day: null,
                relative_trigger: null,
                offset_minutes: 0,
                note: "",
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add step
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!schedule && (
            <p className="text-sm text-muted-foreground">Set active days first to start a schedule for this protocol.</p>
          )}
          {items.map((it: any) => (
            <ItemRow key={it.id} item={it} onSave={(p) => upsertItem.mutate({ ...it, ...p })} onDelete={() => deleteItem.mutate(it.id)} />
          ))}
        </CardContent>
      </Card>

      <FullDayPreview
        items={items}
        fastHours={
          (protocolOptions.find((x: any) => x.id === effectiveId) as any)?.fast_target_hours ?? 16
        }
      />
    </div>
  );
}

function ItemRow({ item, onSave, onDelete }: { item: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [local, setLocal] = useState<any>(item);
  const { data: supplements } = useSupplements();
  const dirty = JSON.stringify(local) !== JSON.stringify(item);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <div>
        <Label className="text-[10px] uppercase tracking-wider">Step type</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {PLAYBOOK_STEP_TYPE_LIST.map((t) => {
            const on = (local.step_type ?? "coaching") === t.code;
            const Icon = t.icon;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setLocal({ ...local, step_type: t.code })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  on ? `${t.tint} ${t.color}` : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase tracking-wider">Label</Label>
          <Input value={local.label} onChange={(e) => setLocal({ ...local, label: e.target.value })} />
          <p className="text-[10px] text-muted-foreground mt-1">Short title shown on the client's timeline.</p>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider">When</Label>
          <Select
            value={local.relative_trigger ?? "__abs__"}
            onValueChange={(v) => setLocal({ ...local, relative_trigger: v === "__abs__" ? null : v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGER_OPTIONS.map((t) => (
                <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1">Anchor: a clock time or a moment in the day (window opens, wake-up, etc.).</p>
        </div>

        {!local.relative_trigger ? (
          <div>
            <Label className="text-[10px] uppercase tracking-wider">At (clock time)</Label>
            <Input
              type="time"
              value={local.time_of_day?.slice(0, 5) ?? ""}
              onChange={(e) => setLocal({ ...local, time_of_day: e.target.value || null })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Exact time of day, e.g. 12:00 PM.</p>
          </div>
        ) : (
          <div>
            <Label className="text-[10px] uppercase tracking-wider">Offset (minutes)</Label>
            <Input
              type="number"
              value={local.offset_minutes ?? 0}
              onChange={(e) => setLocal({ ...local, offset_minutes: parseInt(e.target.value, 10) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Negative = before the anchor (e.g. -30 = 30 min before).</p>
          </div>
        )}

        <div>
          <Label className="text-[10px] uppercase tracking-wider">Supplement (optional)</Label>
          <Select
            value={local.supplement_id ?? "__none__"}
            onValueChange={(v) => setLocal({ ...local, supplement_id: v === "__none__" ? null : v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(supplements ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}{s.default_dose ? ` · ${s.default_dose}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider">Note / what to eat or do</Label>
        <Textarea
          rows={2}
          value={local.note ?? ""}
          onChange={(e) => setLocal({ ...local, note: e.target.value })}
          placeholder={(() => {
            const t = local.step_type ?? "coaching";
            if (t === "meal") return "e.g. Break fast: 4oz salmon, 1 avocado, leafy greens with olive oil";
            if (t === "drink") return "e.g. 16oz water + electrolytes (sodium, potassium, magnesium)";
            if (t === "supplement") return "e.g. Take with first meal, with water";
            if (t === "milestone") return "e.g. Window opens — break your fast slowly";
            return "e.g. Quick mindset check — rate energy 1–10 before eating";
          })()}
        />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider">Show only on keto days</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {KETO_TYPE_LIST.map((k) => {
            const arr: string[] = local.keto_type_filter ?? [];
            const on = arr.includes(k.code);
            return (
              <button
                key={k.code}
                onClick={() => {
                  const next = on ? arr.filter((x) => x !== k.code) : [...arr, k.code];
                  setLocal({ ...local, keto_type_filter: next.length ? next : null });
                }}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  on ? `${KETO_TYPES[k.code].bg} ${KETO_TYPES[k.code].color}` : "border-border text-muted-foreground"
                }`}
              >
                {k.code}
              </button>
            );
          })}
          <span className="text-[11px] text-muted-foreground self-center ml-2">Leave empty = always show</span>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => {
            onSave(local);
            toast.success("Step saved");
          }}
        >
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

function SupplementsEditor() {
  const { data: supplements, upsert, remove } = useSupplements();
  const [draft, setDraft] = useState({ name: "", default_dose: "", default_timing: "", notes: "" });
  // placeholder marker

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Supplement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Name (e.g. Creatine)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input placeholder="Dose (e.g. 5 g)" value={draft.default_dose} onChange={(e) => setDraft({ ...draft, default_dose: e.target.value })} />
            <Input placeholder="Timing hint (e.g. post-workout)" value={draft.default_timing} onChange={(e) => setDraft({ ...draft, default_timing: e.target.value })} />
          </div>
          <Textarea placeholder="Notes (when to take with, skip on, etc.)" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <Button
            disabled={!draft.name.trim()}
            onClick={async () => {
              await upsert.mutateAsync(draft);
              setDraft({ name: "", default_dose: "", default_timing: "", notes: "" });
              toast.success("Supplement added");
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!supplements || supplements.length === 0) && (
            <p className="text-sm text-muted-foreground">No supplements yet. Add Creatine, Electrolytes, MCT, etc. above.</p>
          )}
          {(supplements ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[s.default_dose, s.default_timing].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
// ============================================================================
// Full Day Preview — live timeline with Window Opens/Closes dividers
// ============================================================================
const ANCHOR_DEFAULTS: Record<string, number> = {
  wakeup: 7 * 60,
  sleep: 22 * 60,
  pre_workout: 17 * 60,
  post_workout: 18 * 60,
};

function minToClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${period}`;
}

function FullDayPreview({ items, fastHours }: { items: any[]; fastHours: number }) {
  const [windowOpen, setWindowOpen] = useState("12:00");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const [openH, openM] = windowOpen.split(":").map((x) => parseInt(x, 10));
  const openMin = (openH || 0) * 60 + (openM || 0);
  const eatingHours = Math.max(0, 24 - (fastHours || 16));
  const closeMin = openMin + eatingHours * 60;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const resolved = useMemo(() => {
    const list: Array<{ kind: "item" | "divider"; min: number | null; data: any; key: string }> = [];
    for (const it of items) {
      let min: number | null = null;
      if (it.time_of_day) {
        const [h, m] = it.time_of_day.split(":").map((x: string) => parseInt(x, 10));
        min = h * 60 + (m || 0);
      } else if (it.relative_trigger) {
        const off = it.offset_minutes ?? 0;
        if (it.relative_trigger === "window_open") min = openMin + off;
        else if (it.relative_trigger === "window_close") min = closeMin + off;
        else if (ANCHOR_DEFAULTS[it.relative_trigger] != null)
          min = ANCHOR_DEFAULTS[it.relative_trigger] + off;
      }
      list.push({ kind: "item", min, data: it, key: it.id });
    }
    list.push({ kind: "divider", min: openMin, data: { label: "Window Opens", Icon: Sunrise, tint: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" }, key: "div-open" });
    list.push({ kind: "divider", min: closeMin, data: { label: "Window Closes", Icon: MoonIcon, tint: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/30" }, key: "div-close" });
    return list.sort((a, b) => {
      if (a.min == null) return 1;
      if (b.min == null) return -1;
      return a.min - b.min;
    });
  }, [items, openMin, closeMin]);

  let cursorInserted = false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <CardTitle>Full Day Preview</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Window opens at</Label>
          <Input
            type="time"
            value={windowOpen}
            onChange={(e) => setWindowOpen(e.target.value || "12:00")}
            className="w-[110px]"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-muted/40 border border-border px-2 py-0.5">
            Fasting <strong className="text-foreground">{fastHours}h</strong>
          </span>
          <span className="rounded-full bg-muted/40 border border-border px-2 py-0.5">
            Eating window <strong className="text-foreground">{eatingHours}h</strong>
          </span>
          <span className="rounded-full bg-muted/40 border border-border px-2 py-0.5">
            Window <strong className="text-foreground">{minToClock(openMin)}</strong> → <strong className="text-foreground">{minToClock(closeMin)}</strong>
          </span>
          <span className="ml-auto rounded-full bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 font-semibold">
            Now {minToClock(nowMin)}
          </span>
        </div>

        {resolved.length === 2 && (
          <p className="text-xs text-muted-foreground">No steps yet — add some above and they'll appear here on the timeline.</p>
        )}

        <ul className="space-y-1.5">
          {resolved.map((row) => {
            const nodes: JSX.Element[] = [];
            // Inject live cursor before first row whose min >= nowMin
            if (!cursorInserted && row.min != null && row.min >= nowMin) {
              cursorInserted = true;
              nodes.push(
                <li key="now-cursor" className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Now · {minToClock(nowMin)}</span>
                  <div className="h-px flex-1 bg-primary/60" />
                </li>
              );
            }
            if (row.kind === "divider") {
              const { label, Icon, tint, bg } = row.data;
              nodes.push(
                <li key={row.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${bg}`}>
                  <Icon className={`h-4 w-4 ${tint}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${tint}`}>{label}</span>
                  <span className="ml-auto text-xs font-semibold text-muted-foreground">{minToClock(row.min!)}</span>
                </li>
              );
            } else {
              const it = row.data;
              const meta = getStepTypeMeta(it.step_type);
              const Icon = meta.icon;
              nodes.push(
                <li key={row.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${meta.tint}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{it.label}</div>
                    {it.note && <div className="text-[11px] text-muted-foreground truncate">{it.note}</div>}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    {row.min != null ? minToClock(row.min) : "—"}
                  </span>
                </li>
              );
            }
            return nodes;
          })}
          {!cursorInserted && (
            <li className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-primary/60" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Now · {minToClock(nowMin)}</span>
              <div className="h-px flex-1 bg-primary/60" />
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
