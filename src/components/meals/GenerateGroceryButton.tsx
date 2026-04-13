import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";

interface Props {
  recipeIds: string[];
  listName?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function GenerateGroceryButton({ recipeIds, listName, variant = "outline", className }: Props) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const clientId = useEffectiveClientId();

  const generate = async () => {
    if (!clientId || recipeIds.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-grocery-list", {
        body: { client_id: clientId, recipe_ids: recipeIds, list_name: listName },
      });
      if (error) throw error;
      toast({
        title: "🛒 Grocery list ready!",
        description: `${data.item_count} items generated.`,
      });
      navigate(`/client/grocery?id=${data.list_id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate list", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={generate}
      disabled={loading || recipeIds.length === 0}
    >
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
      Generate Grocery List
    </Button>
  );
}
