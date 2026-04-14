import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Clock, ChefHat, Users, Bookmark, BookmarkCheck, Plus, Flame, Check, MoreHorizontal, Zap, Shield, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ClientRecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [servings, setServings] = useState(1);
  const [logCount, setLogCount] = useState(0);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["client-recipe", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ingredients } = useQuery({
    queryKey: ["recipe-ingredients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", id!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: savedRecipe } = useQuery({
    queryKey: ["saved-recipe", user?.id, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_saved_recipes")
        .select("*")
        .eq("client_id", user!.id)
        .eq("recipe_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!id,
  });

  const { data: collections } = useQuery({
    queryKey: ["recipe-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_recipe_collections")
        .select("*")
        .eq("client_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isSaved = !!savedRecipe;

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isSaved) {
        await supabase.from("client_saved_recipes").delete().eq("id", savedRecipe!.id);
      } else {
        setShowBookmarkSheet(true);
        return;
      }
    },
    onSuccess: () => {
      if (isSaved) {
        queryClient.invalidateQueries({ queryKey: ["saved-recipe"] });
        toast.success("Removed from saved");
      }
    },
  });

  const saveToCollection = useMutation({
    mutationFn: async (collectionId: string | null) => {
      await supabase.from("client_saved_recipes").insert({
        client_id: user!.id,
        recipe_id: id!,
        collection_id: collectionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-recipe"] });
      setShowBookmarkSheet(false);
      toast.success("Recipe saved!");
    },
  });

  const createCollection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("client_recipe_collections")
        .insert({ client_id: user!.id, name: newCollectionName.trim() })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-collections"] });
      setNewCollectionName("");
      setShowNewCollection(false);
      saveToCollection.mutate(data.id);
    },
  });

  const logMeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nutrition_logs").insert({
        client_id: user!.id,
        meal_name: recipe!.name,
        calories: recipe!.calories ? Math.round(recipe!.calories * servings / (recipe!.servings || 1)) : null,
        protein: recipe!.protein ? Math.round(Number(recipe!.protein) * servings / (recipe!.servings || 1)) : null,
        carbs: recipe!.carbs ? Math.round(Number(recipe!.carbs) * servings / (recipe!.servings || 1)) : null,
        fats: recipe!.fats ? Math.round(Number(recipe!.fats) * servings / (recipe!.servings || 1)) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLogCount((c) => c + 1);
      setShowLogDrawer(false);
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      toast.success("Successfully logged meal to Macros");
    },
  });

  const scaledCalories = recipe?.calories ? Math.round(recipe.calories * servings / (recipe.servings || 1)) : 0;
  const scaledProtein = recipe?.protein ? Math.round(Number(recipe.protein) * servings / (recipe.servings || 1)) : 0;
  const scaledCarbs = recipe?.carbs ? Math.round(Number(recipe.carbs) * servings / (recipe.servings || 1)) : 0;
  const scaledFats = recipe?.fats ? Math.round(Number(recipe.fats) * servings / (recipe.servings || 1)) : 0;

  if (isLoading || !recipe) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ClientLayout>
    );
  }

  const ketoTypes = (recipe.keto_types as string[] | null) || [];
  const mealRole = recipe.meal_role as string | null;
  const mealIntensity = recipe.meal_intensity as string | null;
  const bestFor = (recipe.best_for as string[] | null) || [];
  const avoidIf = (recipe.avoid_if as string[] | null) || [];
  const mealTiming = recipe.meal_timing as string | null;
  const whyItWorks = recipe.why_it_works as string | null;
  const carbLimitNote = recipe.carb_limit_note as string | null;
  const proteinTargetNote = recipe.protein_target_note as string | null;

  // Parse instructions
  const instructionText = recipe.instructions || "";
  const ingredientsFromInstructions = instructionText.match(/## Ingredients\n([\s\S]*?)(?=## |$)/)?.[1]?.trim();
  const directionsFromInstructions = instructionText.match(/## Directions\n([\s\S]*?)$/)?.[1]?.trim();
  const plainInstructions = !instructionText.includes("## ") ? instructionText : null;

  const intensityColor = mealIntensity === 'heavy' ? 'bg-red-500' : mealIntensity === 'moderate' ? 'bg-amber-500' : mealIntensity === 'light' ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <ClientLayout>
      <div className="pb-24">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setServings(recipe.servings || 1); setShowLogDrawer(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Log meal
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isSaved ? toggleBookmark.mutate() : setShowBookmarkSheet(true)}
            >
              {isSaved ? (
                <BookmarkCheck className="h-5 w-5 text-amber-500 fill-amber-500" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
            {logCount > 0 && (
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Hero Image with Badges */}
        <div className="relative">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.name} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <ChefHat className="h-16 w-16 text-primary/40" />
            </div>
          )}
          {/* Image Badges */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {ketoTypes.map((kt) => (
              <Badge key={kt} className="bg-black/70 text-white border-0 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5">
                {kt.replace(/^-\s*/, '')}
              </Badge>
            ))}
            {mealRole && (
              <Badge className="bg-primary/80 text-primary-foreground border-0 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5">
                {mealRole.replace(/_/g, ' ')}
              </Badge>
            )}
            {mealIntensity && (
              <Badge className={`${intensityColor} text-white border-0 backdrop-blur-sm text-[10px] font-bold capitalize px-2 py-0.5`}>
                {mealIntensity}
              </Badge>
            )}
          </div>
          {logCount > 0 && (
            <Badge className="absolute top-3 right-3 bg-green-500 text-white border-0 text-[10px]">
              <Check className="h-3 w-3 mr-0.5" /> Logged ({logCount})
            </Badge>
          )}
        </div>

        {/* Title */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">{recipe.name}</h1>
        </div>

        {/* Quick Info Row */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Flame className="h-3.5 w-3.5 mx-auto text-orange-500 mb-0.5" />
              <p className="font-bold text-base">{recipe.calories || 0}</p>
              <p className="text-[10px] text-muted-foreground">Calories</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Zap className="h-3.5 w-3.5 mx-auto text-blue-500 mb-0.5" />
              <p className="font-bold text-base">{Number(recipe.protein || 0)}g</p>
              <p className="text-[10px] text-muted-foreground">Protein</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Target className="h-3.5 w-3.5 mx-auto text-green-500 mb-0.5" />
              <p className="font-bold text-base">{Number(recipe.carbs || 0)}g</p>
              <p className="text-[10px] text-muted-foreground">Carbs</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Clock className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-0.5" />
              <p className="font-bold text-base">{recipe.prep_time_minutes || 0}m</p>
              <p className="text-[10px] text-muted-foreground">Prep</p>
            </div>
          </div>
        </div>

        {/* Tab System */}
        <div className="px-4">
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 overflow-x-auto">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-xs whitespace-nowrap">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="ingredients" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-xs whitespace-nowrap">
                    Ingredients
                  </TabsTrigger>
                  <TabsTrigger value="instructions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-xs whitespace-nowrap">
                    Instructions
                  </TabsTrigger>
                  <TabsTrigger value="why" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-xs whitespace-nowrap">
                    Why It Works
                  </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="p-4 space-y-5">
                  {recipe.description && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Description</h4>
                      <p className="text-sm text-foreground leading-relaxed">{recipe.description}</p>
                    </div>
                  )}

                  {bestFor.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1.5">Best For</h4>
                      <div className="space-y-1">
                        {bestFor.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 text-xs mt-0.5">✓</span>
                            <span className="text-sm text-foreground">{item.replace(/^-\s*/, '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {avoidIf.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">Avoid If</h4>
                      <div className="space-y-1">
                        {avoidIf.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 text-xs mt-0.5">⚠</span>
                            <span className="text-sm text-foreground">{item.replace(/^-\s*/, '')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mealTiming && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Meal Timing</h4>
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground">{mealTiming}</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* INGREDIENTS TAB */}
                <TabsContent value="ingredients" className="p-4">
                  {ingredients && ingredients.length > 0 ? (
                    <div className="divide-y divide-border">
                      {ingredients.map((ing: any) => (
                        <div key={ing.id} className="flex items-center justify-between py-3">
                          <span className="text-sm font-medium">{ing.name}</span>
                          <span className="text-sm text-muted-foreground">{ing.amount} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  ) : ingredientsFromInstructions ? (
                    <div className="divide-y divide-border">
                      {ingredientsFromInstructions.split("\n").filter(Boolean).map((line, i) => (
                        <div key={i} className="flex items-center gap-3 py-3">
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          <span className="text-sm">{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No ingredients added yet.</p>
                  )}
                </TabsContent>

                {/* INSTRUCTIONS TAB */}
                <TabsContent value="instructions" className="p-4">
                  {(directionsFromInstructions || plainInstructions) ? (
                    <div className="space-y-4">
                      {(directionsFromInstructions || plainInstructions || "").split("\n").filter(Boolean).map((line, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed pt-0.5">{line.replace(/^\d+\.\s*/, "")}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No instructions added yet.</p>
                  )}
                </TabsContent>

                {/* WHY IT WORKS TAB */}
                <TabsContent value="why" className="p-4 space-y-5">
                  {whyItWorks && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Why This Meal Works</h4>
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                        <p className="text-sm text-foreground leading-relaxed">{whyItWorks}</p>
                      </div>
                    </div>
                  )}

                  {carbLimitNote && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Carb Limit Note
                      </h4>
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                        <p className="text-sm text-foreground">{carbLimitNote}</p>
                      </div>
                    </div>
                  )}

                  {proteinTargetNote && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1.5 flex items-center gap-1">
                        <Zap className="h-3 w-3" /> Protein Target Note
                      </h4>
                      <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        <p className="text-sm text-foreground">{proteinTargetNote}</p>
                      </div>
                    </div>
                  )}

                  {!whyItWorks && !carbLimitNote && !proteinTargetNote && (
                    <p className="text-sm text-muted-foreground">No intelligence data available for this meal yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Meal Drawer */}
      <Drawer open={showLogDrawer} onOpenChange={setShowLogDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <p className="text-xs text-muted-foreground">Today</p>
            <DrawerTitle>{recipe.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label className="text-sm">Number of Serving</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Measurement</Label>
                <div className="mt-1 px-4 py-2 border rounded-md text-sm bg-muted">serving</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-muted rounded-lg p-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="font-bold">{scaledCalories}</span>
                </div>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <span className="font-bold">{scaledProtein}g</span>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <span className="font-bold">{scaledCarbs}g</span>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <span className="font-bold">{scaledFats}g</span>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => logMeal.mutate()}
              disabled={logMeal.isPending}
            >
              {logMeal.isPending ? "Logging..." : "Log"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bookmark Sheet */}
      <Drawer open={showBookmarkSheet} onOpenChange={setShowBookmarkSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Save Recipe</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            <div
              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
              onClick={() => saveToCollection.mutate(null)}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-medium">Saved</span>
              </div>
              <BookmarkCheck className="h-5 w-5 text-amber-500" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <h4 className="font-bold">Collections</h4>
              <button className="text-sm text-primary font-medium" onClick={() => setShowNewCollection(true)}>
                New collection
              </button>
            </div>

            {collections?.map((col: any) => (
              <div
                key={col.id}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                onClick={() => saveToCollection.mutate(col.id)}
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="font-medium">{col.name}</span>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* New Collection Dialog */}
      <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCollection(false)}>Cancel</Button>
            <Button onClick={() => createCollection.mutate()} disabled={!newCollectionName.trim()}>
              Create & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
