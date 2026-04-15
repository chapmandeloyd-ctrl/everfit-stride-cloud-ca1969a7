import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ShoppingCart, Sparkles, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { GroceryShortageAlerts } from "@/components/meals/GroceryShortageAlerts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

interface GroceryItem {
  id: string;
  ingredient_name: string;
  amount: string | null;
  unit: string | null;
  category: string;
  is_purchased: boolean;
  meal_sources: string[];
  is_manual: boolean;
  used_amount: string | null;
  original_amount: string | null;
  is_low_stock: boolean;
}

interface GroceryList {
  id: string;
  name: string;
  list_date: string;
}

const CATEGORY_ORDER = ["Protein", "Fats", "Vegetables", "Dairy", "Pantry", "Seasonings", "Other"];
const CATEGORY_EMOJI: Record<string, string> = {
  Protein: "🥩",
  Fats: "🥑",
  Vegetables: "🥬",
  Dairy: "🧀",
  Pantry: "📦",
  Seasonings: "🧂",
  Other: "🛒",
};

export default function ClientGroceryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clientId = useEffectiveClientId();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get("id");
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Fetch latest list or specific list
  const { data: groceryList, isLoading: listLoading } = useQuery({
    queryKey: ["grocery-list", clientId, listId],
    queryFn: async () => {
      let query = supabase
        .from("grocery_lists")
        .select("*")
        .eq("client_id", clientId!);
      if (listId) {
        query = query.eq("id", listId);
      } else {
        query = query.order("created_at", { ascending: false }).limit(1);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      return data as GroceryList;
    },
    enabled: !!clientId,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["grocery-items", groceryList?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_list_items")
        .select("*")
        .eq("list_id", groceryList!.id)
        .order("category")
        .order("ingredient_name");
      if (error) throw error;
      return data as GroceryItem[];
    },
    enabled: !!groceryList?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, purchased }: { id: string; purchased: boolean }) => {
      const { error } = await supabase
        .from("grocery_list_items")
        .update({ is_purchased: purchased })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery-items"] }),
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!newItem.trim() || !groceryList?.id) return;
      const { error } = await supabase.from("grocery_list_items").insert({
        list_id: groceryList.id,
        ingredient_name: newItem.trim(),
        category: newCategory,
        is_manual: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewItem("");
      queryClient.invalidateQueries({ queryKey: ["grocery-items"] });
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, GroceryItem[]>();
    for (const item of items) {
      const cat = item.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ category: c, items: map.get(c)! }));
  }, [items]);

  const lowStockItems = useMemo(() => items.filter((i) => i.is_low_stock && !i.is_purchased), [items]);

  const totalItems = items.length;
  const purchasedCount = items.filter((i) => i.is_purchased).length;
  const progress = totalItems > 0 ? Math.round((purchasedCount / totalItems) * 100) : 0;

  const loading = listLoading || itemsLoading;
  const noList = !loading && !groceryList;

  const regenerateList = async () => {
    if (!clientId) return;
    try {
      const { data, error } = await supabase.functions.invoke("generate-grocery-list", {
        body: { client_id: clientId, recipe_ids: [], list_name: `Week of ${new Date().toLocaleDateString()}`, regenerate: true },
      });
      if (error) throw error;
      toast({ title: "🛒 List regenerated!", description: "Fresh grocery list based on your current meals." });
      queryClient.invalidateQueries({ queryKey: ["grocery-list"] });
      queryClient.invalidateQueries({ queryKey: ["grocery-items"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <ClientLayout>
      <div className="pb-6 w-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold">Grocery List</h1>
            {groceryList && (
              <p className="text-xs text-muted-foreground">{groceryList.name}</p>
            )}
          </div>
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Progress */}
        {!loading && groceryList && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{purchasedCount} of {totalItems} items</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {/* Regenerate button */}
          <div className="px-5 pb-2">
            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs" onClick={regenerateList}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Regenerate from Current Meals
            </Button>
          </div>
        )}

        {/* Shortage Alerts */}
        {!loading && lowStockItems.length > 0 && (
          <GroceryShortageAlerts lowStockItems={lowStockItems} />
        )}

        {/* Loading */}
        {loading && (
          <div className="px-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* No list */}
        {noList && (
          <div className="px-5 text-center py-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-1 font-medium">No grocery list yet</p>
            <p className="text-xs text-muted-foreground mb-6">
              Select meals and generate a list, or create one from your meal plan.
            </p>
            <Button onClick={() => navigate("/client/meal-results")} className="rounded-2xl">
              <Sparkles className="h-4 w-4 mr-2" />
              Browse Meals
            </Button>
          </div>
        )}

        {/* Grouped Items */}
        {!loading && grouped.length > 0 && (
          <div className="px-5 space-y-4">
            {grouped.map(({ category, items: catItems }) => {
              const collapsed = collapsedCategories.has(category);
              const catPurchased = catItems.filter((i) => i.is_purchased).length;
              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center justify-between w-full mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{CATEGORY_EMOJI[category] || "🛒"}</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {category}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {catPurchased}/{catItems.length}
                      </Badge>
                    </div>
                    {collapsed ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {!collapsed && (
                    <div className="space-y-1.5">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
                            item.is_purchased
                              ? "bg-muted/20 border-border/50 opacity-60"
                              : "bg-card border-border"
                          }`}
                        >
                          <Checkbox
                            checked={item.is_purchased}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: item.id, purchased: !!checked })
                            }
                            className="h-5 w-5"
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${
                                item.is_purchased ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {item.ingredient_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.amount && (
                                <span className="text-[10px] text-muted-foreground">
                                  {item.amount}{item.unit ? ` ${item.unit}` : ""}
                                </span>
                              )}
                              {item.meal_sources?.length > 0 && (
                                <span className="text-[10px] text-primary/70 truncate">
                                  {item.meal_sources.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Add */}
        {groceryList && (
          <div className="px-5 pt-5">
            <div className="flex gap-2">
              <Input
                placeholder="Add item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="flex-1 h-11 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addItemMutation.mutate();
                }}
              />
              <Button
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
                onClick={() => addItemMutation.mutate()}
                disabled={!newItem.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
