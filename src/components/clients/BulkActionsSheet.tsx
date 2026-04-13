import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckSquare2, Square, X, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClientIds: string[];
  trainerId: string;
  onClearSelection: () => void;
}

export function BulkActionsSheet({ open, onOpenChange, selectedClientIds, trainerId, onClearSelection }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkKetoId, setBulkKetoId] = useState("");
  const [bulkProtocolId, setBulkProtocolId] = useState("");
  const [bulkToggle, setBulkToggle] = useState<{ key: string; value: boolean } | null>(null);

  const { data: ketoTypes } = useQuery({
    queryKey: ["keto-types-list"],
    queryFn: async () => {
      const { data } = await supabase.from("keto_types").select("id, name, abbreviation").order("name");
      return data || [];
    },
    enabled: open,
  });

  const { data: protocols } = useQuery({
    queryKey: ["fasting-protocols-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fasting_protocols").select("id, name").order("name");
      return data || [];
    },
    enabled: open,
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<any>[] = [];

      if (bulkAction === "assign_keto" && bulkKetoId) {
        for (const clientId of selectedClientIds) {
          promises.push(
            supabase.from("client_keto_assignments").update({ is_active: false }).eq("client_id", clientId).then(() =>
              supabase.from("client_keto_assignments").insert({
                client_id: clientId,
                keto_type_id: bulkKetoId,
                assigned_by: trainerId,
                is_active: true,
              })
            )
          );
        }
      }

      if (bulkAction === "assign_protocol" && bulkProtocolId) {
        promises.push(
          supabase.from("client_feature_settings")
            .update({ selected_protocol_id: bulkProtocolId, protocol_start_date: new Date().toISOString().split("T")[0] })
            .in("client_id", selectedClientIds)
        );
      }

      if (bulkAction === "toggle_feature" && bulkToggle) {
        promises.push(
          supabase.from("client_feature_settings")
            .update({ [bulkToggle.key]: bulkToggle.value })
            .in("client_id", selectedClientIds)
        );
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-health-scores"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: `Updated ${selectedClientIds.length} clients` });
      onClearSelection();
      onOpenChange(false);
      setBulkAction("");
    },
    onError: () => toast({ title: "Failed to apply bulk action", variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-base">
            Bulk Actions — {selectedClientIds.length} selected
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-4 pb-6">
          {/* Action picker */}
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger>
              <SelectValue placeholder="Choose action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assign_keto">Assign Keto Type</SelectItem>
              <SelectItem value="assign_protocol">Assign Protocol</SelectItem>
              <SelectItem value="toggle_feature">Toggle Feature</SelectItem>
            </SelectContent>
          </Select>

          {/* Keto type picker */}
          {bulkAction === "assign_keto" && (
            <Select value={bulkKetoId} onValueChange={setBulkKetoId}>
              <SelectTrigger>
                <SelectValue placeholder="Select keto type..." />
              </SelectTrigger>
              <SelectContent>
                {ketoTypes?.map((kt) => (
                  <SelectItem key={kt.id} value={kt.id}>
                    {kt.abbreviation} — {kt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Protocol picker */}
          {bulkAction === "assign_protocol" && (
            <Select value={bulkProtocolId} onValueChange={setBulkProtocolId}>
              <SelectTrigger>
                <SelectValue placeholder="Select protocol..." />
              </SelectTrigger>
              <SelectContent>
                {protocols?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Feature toggle */}
          {bulkAction === "toggle_feature" && (
            <div className="space-y-3">
              {[
                { key: "fasting_enabled", label: "Fasting" },
                { key: "macros_enabled", label: "Macros" },
                { key: "training_enabled", label: "Training" },
                { key: "food_journal_enabled", label: "Food Journal" },
                { key: "tasks_enabled", label: "Tasks" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBulkToggle(prev =>
                    prev?.key === key ? { key, value: !prev.value } : { key, value: true }
                  )}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    bulkToggle?.key === key ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="text-sm font-semibold">{label}</span>
                  {bulkToggle?.key === key && (
                    <Badge variant="outline" className={bulkToggle.value ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}>
                      {bulkToggle.value ? "Enable" : "Disable"}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          <Button
            className="w-full h-11 font-semibold"
            onClick={() => bulkMutation.mutate()}
            disabled={
              bulkMutation.isPending ||
              !bulkAction ||
              (bulkAction === "assign_keto" && !bulkKetoId) ||
              (bulkAction === "assign_protocol" && !bulkProtocolId) ||
              (bulkAction === "toggle_feature" && !bulkToggle)
            }
          >
            {bulkMutation.isPending ? "Applying..." : `Apply to ${selectedClientIds.length} Clients`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
