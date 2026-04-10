import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { RecipientMode, RecipientFilter } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, User, Filter, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface RecipientPickerProps {
  mode: RecipientMode;
  onModeChange: (mode: RecipientMode) => void;
  selectedClientIds: string[];
  onSelectedClientsChange: (ids: string[]) => void;
  filter: RecipientFilter;
  onFilterChange: (filter: RecipientFilter) => void;
  recipientCount: number;
}

export function RecipientPicker({
  mode, onModeChange, selectedClientIds, onSelectedClientsChange,
  filter, onFilterChange, recipientCount
}: RecipientPickerProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["trainer-clients-for-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "client")
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filteredClients = clients.filter(c =>
    (c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     c.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      onSelectedClientsChange(selectedClientIds.filter(cid => cid !== id));
    } else {
      onSelectedClientsChange([...selectedClientIds, id]);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Recipients</Label>
        <Badge variant="secondary" className="text-xs">
          {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="flex gap-2">
        {([
          { value: "individual" as const, label: "Individual", icon: User },
          { value: "all" as const, label: "All Clients", icon: Users },
          { value: "group" as const, label: "Group", icon: Filter },
        ]).map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={mode === value ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange(value)}
            className="flex-1 gap-1.5 text-xs"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {mode === "individual" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm pl-8"
            />
          </div>

          {selectedClientIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedClientIds.map(id => {
                const client = clients.find(c => c.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-xs gap-1">
                    {client?.full_name || client?.email || "Unknown"}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleClient(id)} />
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
            {filteredClients.map(client => (
              <label
                key={client.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedClientIds.includes(client.id)}
                  onCheckedChange={() => toggleClient(client.id)}
                />
                <span className="flex-1 truncate">{client.full_name || "No Name"}</span>
                <span className="text-xs text-muted-foreground truncate">{client.email}</span>
              </label>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
            )}
          </div>
        </div>
      )}

      {mode === "all" && (
        <p className="text-sm text-muted-foreground">
          This notification will be sent to all {clients.length} clients.
        </p>
      )}

      {mode === "group" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Engine Mode</Label>
            <Select
              value={filter.engine_mode || "any"}
              onValueChange={(v) => onFilterChange({ ...filter, engine_mode: v === "any" ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="metabolic">Metabolic</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="athletic">Athletic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Subscription Tier</Label>
            <Select
              value={filter.subscription_tier || "any"}
              onValueChange={(v) => onFilterChange({ ...filter, subscription_tier: v === "any" ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </Card>
  );
}
