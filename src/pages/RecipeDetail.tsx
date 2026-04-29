import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Clock, ChefHat, Users, Pencil, Trash2, Flame, Zap, Shield, Target, Droplets } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditRecipeDialog } from "@/components/nutrition/EditRecipeDialog";
import { DeleteRecipeDialog } from "@/components/nutrition/DeleteRecipeDialog";
import { validateMacros } from "@/components/nutrition/macroValidator";
import { MacroValidationBanner } from "@/components/meals/MacroValidationBanner";
import { MacroPercentBar } from "@/components/nutrition/MacroPercentBar";

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<any>(null);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe-detail", id],
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

  if (isLoading || !recipe) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
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
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/recipes")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingRecipe(recipe)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setDeletingRecipe(recipe)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hero Image with Badges */}
        <div className="relative rounded-xl overflow-hidden">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.name} className="w-full h-72 object-cover" />
          ) : (
            <div className="w-full h-72 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <ChefHat className="h-16 w-16 text-primary/40" />
            </div>
          )}
          {/* Image Badges */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {ketoTypes.map((kt) => (
              <Badge key={kt} className="bg-black/70 text-white border-0 backdrop-blur-sm text-xs font-bold">
                {kt.replace(/^-\s*/, '')}
              </Badge>
            ))}
            {mealRole && (
              <Badge className="bg-primary/80 text-primary-foreground border-0 backdrop-blur-sm text-xs font-bold">
                {mealRole.replace(/_/g, ' ')}
              </Badge>
            )}
            {mealIntensity && (
              <Badge className={`${intensityColor} text-white border-0 backdrop-blur-sm text-xs font-bold capitalize`}>
                {mealIntensity}
              </Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground">{recipe.name}</h1>

        {/* Macro Validation Banner */}
        {(() => {
          const v = validateMacros({
            calories: recipe.calories,
            protein: recipe.protein,
            fats: recipe.fats,
            carbs: recipe.carbs,
            keto_types: recipe.keto_types as string[] | undefined,
            meal_role: recipe.meal_role,
          });
          return v.validation_flags.length > 0 ? (
            <MacroValidationBanner flags={v.validation_flags} warnings={v.warnings} />
          ) : null;
        })()}

        {/* Quick Info Row */}
        <div className="grid grid-cols-5 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Flame className="h-4 w-4 mx-auto text-orange-500 mb-1" />
              <p className="font-bold text-lg">{recipe.calories || 0}</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Zap className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <p className="font-bold text-lg">{Number(recipe.protein || 0)}g</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Droplets className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
              <p className="font-bold text-lg">{Number(recipe.fats || 0)}g</p>
              <p className="text-xs text-muted-foreground">Fat</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Target className="h-4 w-4 mx-auto text-green-500 mb-1" />
              <p className="font-bold text-lg">{Number(recipe.carbs || 0)}g</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="font-bold text-lg">{recipe.prep_time_minutes || 0}m</p>
              <p className="text-xs text-muted-foreground">Prep</p>
            </CardContent>
          </Card>
        </div>

        {/* Macro % Breakdown */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Calorie Breakdown
            </h4>
            <MacroPercentBar
              macros={{
                calories: recipe.calories,
                protein: recipe.protein,
                fats: recipe.fats,
                carbs: recipe.carbs,
              }}
              ketoTypes={recipe.keto_types as string[] | null}
            />
          </CardContent>
        </Card>

        {/* Tab System */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="ingredients" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm">
                  Ingredients
                </TabsTrigger>
                <TabsTrigger value="instructions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm">
                  Instructions
                </TabsTrigger>
                <TabsTrigger value="why" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3 text-sm">
                  Why It Works
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="p-6 space-y-6">
                {/* Description */}
                {recipe.description && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                    <p className="text-sm text-foreground leading-relaxed">{recipe.description}</p>
                  </div>
                )}

                {/* Best For */}
                {bestFor.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-2">Best For</h4>
                    <div className="space-y-1.5">
                      {bestFor.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          <span className="text-sm text-foreground">{item.replace(/^-\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Avoid If */}
                {avoidIf.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">Avoid If</h4>
                    <div className="space-y-1.5">
                      {avoidIf.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">⚠</span>
                          <span className="text-sm text-foreground">{item.replace(/^-\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meal Timing */}
                {mealTiming && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Meal Timing</h4>
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{mealTiming}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* INGREDIENTS TAB */}
              <TabsContent value="ingredients" className="p-6">
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
              <TabsContent value="instructions" className="p-6">
                {(directionsFromInstructions || plainInstructions) ? (
                  <div className="space-y-4">
                    {(directionsFromInstructions || plainInstructions || "").split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed pt-1">{line.replace(/^\d+\.\s*/, "")}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No instructions added yet.</p>
                )}
              </TabsContent>

              {/* WHY IT WORKS TAB */}
              <TabsContent value="why" className="p-6 space-y-6">
                {whyItWorks && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Why This Meal Works</h4>
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                      <p className="text-sm text-foreground leading-relaxed">{whyItWorks}</p>
                    </div>
                  </div>
                )}

                {carbLimitNote && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Carb Limit Note
                    </h4>
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                      <p className="text-sm text-foreground">{carbLimitNote}</p>
                    </div>
                  </div>
                )}

                {proteinTargetNote && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-2 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> Protein Target Note
                    </h4>
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
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

      {editingRecipe && (
        <EditRecipeDialog
          recipe={editingRecipe}
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
        />
      )}

      {deletingRecipe && (
        <DeleteRecipeDialog
          recipe={deletingRecipe}
          open={!!deletingRecipe}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingRecipe(null);
              navigate("/recipes");
            }
          }}
        />
      )}
    </DashboardLayout>
  );
}
