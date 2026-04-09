import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Save, Loader2, GripVertical } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimelineEntry {
  phase: number;
  title: string;
  period: string;
  detail: string;
}

interface SynergyFormData {
  keto_synergy: string;
  how_it_works: string;
  the_science: string;
  adaptation_timeline: TimelineEntry[];
  built_for: string[];
  coach_notes: string[];
  eat_this: string[];
  avoid_this: string[];
  coach_warning: string;
}

interface SynergyManualEditorProps {
  protocolType: "program" | "quick_plan";
  protocolId: string;
  ketoTypeId: string;
  protocolName: string;
  ketoTypeName: string;
  existingContent?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

function parseExisting(raw?: string | null): SynergyFormData {
  const empty: SynergyFormData = {
    keto_synergy: "",
    how_it_works: "",
    the_science: "",
    adaptation_timeline: [{ phase: 1, title: "", period: "", detail: "" }],
    built_for: [""],
    coach_notes: [""],
    eat_this: [""],
    avoid_this: [""],
    coach_warning: "",
  };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.keto_synergy) return empty;
    return {
      keto_synergy: parsed.keto_synergy || "",
      how_it_works: parsed.how_it_works || "",
      the_science: parsed.the_science || "",
      adaptation_timeline: parsed.adaptation_timeline?.length
        ? parsed.adaptation_timeline
        : [{ phase: 1, title: "", period: "", detail: "" }],
      built_for: parsed.built_for?.length ? parsed.built_for : [""],
      coach_notes: parsed.coach_notes?.length ? parsed.coach_notes : [""],
      eat_this: parsed.eat_this?.length ? parsed.eat_this : [""],
      avoid_this: parsed.avoid_this?.length ? parsed.avoid_this : [""],
      coach_warning: parsed.coach_warning || "",
    };
  } catch {
    return empty;
  }
}

export function SynergyManualEditor({
  protocolType,
  protocolId,
  ketoTypeId,
  protocolName,
  ketoTypeName,
  existingContent,
  onSaved,
  onCancel,
}: SynergyManualEditorProps) {
  const [form, setForm] = useState<SynergyFormData>(() => parseExisting(existingContent));
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Clean up empty entries
      const cleaned = {
        ...form,
        adaptation_timeline: form.adaptation_timeline.filter(t => t.title.trim()),
        built_for: form.built_for.filter(b => b.trim()),
        coach_notes: form.coach_notes.filter(n => n.trim()),
        eat_this: form.eat_this.filter(e => e.trim()),
        avoid_this: form.avoid_this.filter(a => a.trim()),
      };

      const synergyText = JSON.stringify(cleaned);

      // Upsert: delete existing then insert
      await supabase
        .from("plan_synergy_content")
        .delete()
        .eq("protocol_type", protocolType)
        .eq("protocol_id", protocolId)
        .eq("keto_type_id", ketoTypeId);

      const { error } = await supabase.from("plan_synergy_content").insert({
        protocol_type: protocolType,
        protocol_id: protocolId,
        keto_type_id: ketoTypeId,
        protocol_name: protocolName,
        keto_type_name: ketoTypeName,
        synergy_text: synergyText,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-synergy"] });
      toast.success("Synergy content saved!");
      onSaved();
    },
    onError: () => toast.error("Failed to save synergy content"),
  });

  const updateField = (field: keyof SynergyFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateListItem = (field: "built_for" | "coach_notes" | "eat_this" | "avoid_this", index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addListItem = (field: "built_for" | "coach_notes" | "eat_this" | "avoid_this") => {
    setForm(prev => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeListItem = (field: "built_for" | "coach_notes" | "eat_this" | "avoid_this", index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const updateTimeline = (index: number, key: keyof TimelineEntry, value: string | number) => {
    setForm(prev => ({
      ...prev,
      adaptation_timeline: prev.adaptation_timeline.map((t, i) =>
        i === index ? { ...t, [key]: value } : t
      ),
    }));
  };

  const addTimelineEntry = () => {
    setForm(prev => ({
      ...prev,
      adaptation_timeline: [
        ...prev.adaptation_timeline,
        { phase: prev.adaptation_timeline.length + 1, title: "", period: "", detail: "" },
      ],
    }));
  };

  const removeTimelineEntry = (index: number) => {
    setForm(prev => ({
      ...prev,
      adaptation_timeline: prev.adaptation_timeline.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* KETO SYNERGY */}
      <SectionBlock title="Keto Synergy" subtitle="How fasting + keto type work as ONE system (4-6 sentences)">
        <Textarea
          value={form.keto_synergy}
          onChange={e => updateField("keto_synergy", e.target.value)}
          placeholder="Paste your keto synergy explanation here..."
          className="min-h-[100px] text-sm"
        />
      </SectionBlock>

      {/* HOW IT WORKS */}
      <SectionBlock title="How It Works" subtitle="Physiology: glycogen, ketones, protein, fat oxidation (5-8 sentences)">
        <Textarea
          value={form.how_it_works}
          onChange={e => updateField("how_it_works", e.target.value)}
          placeholder="Paste how it works..."
          className="min-h-[100px] text-sm"
        />
      </SectionBlock>

      {/* THE SCIENCE */}
      <SectionBlock title="The Science" subtitle="MPS, thermogenesis, hormones, performance (4-6 sentences)">
        <Textarea
          value={form.the_science}
          onChange={e => updateField("the_science", e.target.value)}
          placeholder="Paste the science..."
          className="min-h-[100px] text-sm"
        />
      </SectionBlock>

      {/* ADAPTATION TIMELINE */}
      <SectionBlock title="Adaptation Timeline" subtitle="Structured phases (e.g. Week 1-2, Week 3-4)">
        <div className="space-y-3">
          {form.adaptation_timeline.map((entry, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Phase {i + 1}</span>
                {form.adaptation_timeline.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeTimelineEntry(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Title (e.g. Fat Adaptation)"
                  value={entry.title}
                  onChange={e => updateTimeline(i, "title", e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Period (e.g. Week 1-2)"
                  value={entry.period}
                  onChange={e => updateTimeline(i, "period", e.target.value)}
                  className="text-sm"
                />
              </div>
              <Textarea
                placeholder="Detail for this phase..."
                value={entry.detail}
                onChange={e => updateTimeline(i, "detail", e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={addTimelineEntry}>
            <Plus className="h-3 w-3 mr-1" /> Add Phase
          </Button>
        </div>
      </SectionBlock>

      {/* BUILT FOR */}
      <SectionBlock title="Built For" subtitle="Who this system is designed for">
        <ListEditor
          items={form.built_for}
          placeholder="e.g. Athletes looking to lean out"
          onUpdate={(i, v) => updateListItem("built_for", i, v)}
          onAdd={() => addListItem("built_for")}
          onRemove={(i) => removeListItem("built_for", i)}
        />
      </SectionBlock>

      {/* COACH NOTES */}
      <SectionBlock title="Coach Notes" subtitle="Key coaching directives">
        <ListEditor
          items={form.coach_notes}
          placeholder="e.g. Keep protein at 1g per lb"
          onUpdate={(i, v) => updateListItem("coach_notes", i, v)}
          onAdd={() => addListItem("coach_notes")}
          onRemove={(i) => removeListItem("coach_notes", i)}
        />
      </SectionBlock>

      {/* EAT THIS / AVOID THIS */}
      <div className="grid grid-cols-2 gap-3">
        <SectionBlock title="Eat This" subtitle="Recommended foods">
          <ListEditor
            items={form.eat_this}
            placeholder="e.g. Salmon"
            onUpdate={(i, v) => updateListItem("eat_this", i, v)}
            onAdd={() => addListItem("eat_this")}
            onRemove={(i) => removeListItem("eat_this", i)}
          />
        </SectionBlock>
        <SectionBlock title="Avoid This" subtitle="Foods to avoid">
          <ListEditor
            items={form.avoid_this}
            placeholder="e.g. Sugar"
            onUpdate={(i, v) => updateListItem("avoid_this", i, v)}
            onAdd={() => addListItem("avoid_this")}
            onRemove={(i) => removeListItem("avoid_this", i)}
          />
        </SectionBlock>
      </div>

      {/* COACH WARNING */}
      <SectionBlock title="Coach Warning" subtitle="Bold, tactical insight">
        <Textarea
          value={form.coach_warning}
          onChange={e => updateField("coach_warning", e.target.value)}
          placeholder="e.g. Too much fat will slow results on this plan"
          className="min-h-[60px] text-sm"
        />
      </SectionBlock>

      {/* Actions */}
      <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-2">
        <Button
          className="flex-1"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.keto_synergy.trim()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Content
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SectionBlock({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h4>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function ListEditor({
  items,
  placeholder,
  onUpdate,
  onAdd,
  onRemove,
}: {
  items: string[];
  placeholder: string;
  onUpdate: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={item}
            onChange={e => onUpdate(i, e.target.value)}
            placeholder={placeholder}
            className="text-sm flex-1"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="sm" className="px-2" onClick={() => onRemove(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={onAdd}>
        <Plus className="h-3 w-3 mr-1" /> Add
      </Button>
    </div>
  );
}
