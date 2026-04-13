import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ArrowLeft, ScanBarcode, Search, Plus, Check, Loader2, Camera, Type, Send } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { FoodPhotoAnalyzerDialog } from "@/components/FoodPhotoAnalyzerDialog";
import { MealConfirmationDrawer, type PendingMeal } from "@/components/meals/MealConfirmationDrawer";
import { CoachFeedbackBanner } from "@/components/meals/CoachFeedbackBanner";

interface FoodItem {
  fdcId: number;
  name: string;
  brandOwner: string | null;
  servingSize: number;
  servingSizeUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portions: { amount: number; unit: string; gramWeight: number }[];
}

export default function ClientLogMeal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Handle deep-link query params
  const tabParam = searchParams.get("tab");
  const [initialTabHandled, setInitialTabHandled] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(
    tabParam === "manual" ? "manual" : tabParam === "type" ? "type" : "search"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingCount, setServingCount] = useState("1");
  const [selectedPortion, setSelectedPortion] = useState<string>("");
  const [loggedIds, setLoggedIds] = useState<Set<number>>(new Set());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [photoAnalyzerOpen, setPhotoAnalyzerOpen] = useState(false);

  // Manual add state
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFats, setManualFats] = useState("");

  // Type meal (AI) state
  const [typedMeal, setTypedMeal] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  // Confirmation drawer
  const [pendingMeal, setPendingMeal] = useState<PendingMeal | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Coach feedback
  const [showFeedback, setShowFeedback] = useState(false);

  // Handle deep-link tab param
  useEffect(() => {
    if (initialTabHandled || !tabParam) return;
    setInitialTabHandled(true);
    if (tabParam === "scan") setScannerOpen(true);
    else if (tabParam === "photo") setPhotoAnalyzerOpen(true);
  }, [tabParam, initialTabHandled]);

  // Fetch today's totals for coach feedback
  const { data: todayTotals } = useQuery({
    queryKey: ["nutrition-today", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("nutrition_logs")
        .select("calories, protein, carbs, fats")
        .eq("client_id", user?.id!)
        .eq("log_date", format(new Date(), "yyyy-MM-dd"));
      const totals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      for (const l of data || []) {
        totals.calories += l.calories || 0;
        totals.protein += Number(l.protein) || 0;
        totals.carbs += Number(l.carbs) || 0;
        totals.fats += Number(l.fats) || 0;
      }
      return totals;
    },
    enabled: !!user?.id,
  });

  // Fetch macro targets for coach feedback
  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", user?.id!)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const feedbackTargets = {
    calories: macroTargets?.target_calories || 2000,
    protein: Number(macroTargets?.target_protein) || 150,
    carbs: Number(macroTargets?.target_carbs) || 200,
    fats: Number(macroTargets?.target_fats) || 65,
  };

  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-usda-foods", {
        body: { query: query.trim(), pageSize: 20 },
      });
      if (error) throw error;
      setSearchResults(data?.foods || []);
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Failed to search foods");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => searchFoods(value), 400);
    setSearchTimeout(timeout);
  };

  // Calculate macros based on selected portion
  const getScaledMacros = () => {
    if (!selectedFood) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const count = parseFloat(servingCount) || 1;
    const portion = selectedFood.portions.find(p => p.unit === selectedPortion);
    const gramWeight = portion?.gramWeight || selectedFood.servingSize || 100;
    const scale = (gramWeight / 100) * count;
    return {
      calories: Math.round(selectedFood.calories * scale),
      protein: Math.round(selectedFood.protein * scale * 10) / 10,
      carbs: Math.round(selectedFood.carbs * scale * 10) / 10,
      fats: Math.round(selectedFood.fats * scale * 10) / 10,
    };
  };

  const getDefaultPortion = (food: FoodItem) => {
    if (food.portions.length > 0) return food.portions[0].unit;
    return "100g";
  };

  const getDefaultCalories = (food: FoodItem) => {
    if (food.portions.length > 0) {
      const p = food.portions[0];
      const scale = p.gramWeight / 100;
      return Math.round(food.calories * scale);
    }
    return food.calories;
  };

  const getDefaultPortionLabel = (food: FoodItem) => {
    if (food.portions.length > 0) return food.portions[0].unit;
    return `${food.servingSize}${food.servingSizeUnit}`;
  };

  // Log meal mutation
  const logMutation = useMutation({
    mutationFn: async (mealData: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
      const { error } = await supabase.from("nutrition_logs").insert({
        client_id: user?.id,
        log_date: format(new Date(), "yyyy-MM-dd"),
        meal_name: mealData.name,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fats: mealData.fats,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition-today"] });
      toast.success("Meal logged successfully!");
      setShowFeedback(true);
      setConfirmOpen(false);
      setPendingMeal(null);
    },
    onError: () => toast.error("Failed to log meal"),
  });

  // Open confirmation drawer with pending meal
  const openConfirmation = (meal: PendingMeal) => {
    setPendingMeal(meal);
    setConfirmOpen(true);
  };

  // Handle final confirmation from drawer
  const handleConfirmMeal = (meal: PendingMeal) => {
    logMutation.mutate(meal);
  };

  // Quick add (+ button)
  const handleQuickAdd = (food: FoodItem) => {
    const portion = food.portions[0];
    const scale = portion ? portion.gramWeight / 100 : 1;
    openConfirmation({
      name: food.name,
      calories: Math.round(food.calories * scale),
      protein: Math.round(food.protein * scale * 10) / 10,
      carbs: Math.round(food.carbs * scale * 10) / 10,
      fats: Math.round(food.fats * scale * 10) / 10,
      source: "usda",
      confidence: "high",
    });
  };

  // Log from detail sheet
  const handleLogFromSheet = () => {
    if (!selectedFood) return;
    const macros = getScaledMacros();
    openConfirmation({
      name: selectedFood.name,
      ...macros,
      source: "usda",
      confidence: "high",
    });
    setSelectedFood(null);
  };

  // Manual add submit
  const handleManualAdd = () => {
    if (!manualName.trim()) { toast.error("Please enter a food name"); return; }
    openConfirmation({
      name: manualName.trim(),
      calories: parseInt(manualCalories) || 0,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fats: parseFloat(manualFats) || 0,
      source: "manual",
      confidence: "high",
    });
    setManualName(""); setManualCalories(""); setManualProtein(""); setManualCarbs(""); setManualFats("");
  };

  // Barcode scan → confirmation
  const handleProductScanned = (productData: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    setScannerOpen(false);
    openConfirmation({
      ...productData,
      source: "barcode",
      confidence: "high",
    });
  };

  // Photo analysis → confirmation
  const handlePhotoAnalyzed = (data: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    setPhotoAnalyzerOpen(false);
    openConfirmation({
      ...data,
      source: "ai",
      confidence: "medium",
    });
  };

  // Type meal → AI parse → confirmation
  const handleTypeMeal = async () => {
    if (!typedMeal.trim()) { toast.error("Type what you ate"); return; }
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-meal-text", {
        body: { text: typedMeal.trim() },
      });
      if (error) throw error;
      if (data?.nutrition) {
        openConfirmation({
          name: data.nutrition.name,
          calories: data.nutrition.calories,
          protein: data.nutrition.protein,
          carbs: data.nutrition.carbs,
          fats: data.nutrition.fats,
          source: data.nutrition.source || "ai",
          confidence: data.nutrition.confidence || "medium",
          if_role: data.nutrition.if_role,
          meal_role: data.nutrition.meal_role,
          macro_profile: data.nutrition.macro_profile,
          ingredients: data.nutrition.ingredients,
        });
        setTypedMeal("");
      } else {
        toast.error("Could not parse meal. Try being more specific.");
      }
    } catch (err) {
      console.error("Parse error:", err);
      toast.error("Failed to analyze meal. Try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const scaledMacros = getScaledMacros();

  return (
    <ClientLayout>
      <div className="flex flex-col h-full min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Log Meal</h1>
          </div>
        </div>

        {/* Coach Feedback Banner */}
        {todayTotals && (
          <CoachFeedbackBanner
            totals={todayTotals}
            targets={feedbackTargets}
            show={showFeedback}
            onDismiss={() => setShowFeedback(false)}
          />
        )}

        {/* SECTION 8: Quick Access Cards — Large Tappable */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-3">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10 hover:border-primary/50 active:scale-[0.97]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <ScanBarcode className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-semibold">📦 Scan</p>
          </button>
          <button
            onClick={() => setPhotoAnalyzerOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10 hover:border-primary/50 active:scale-[0.97]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-semibold">📸 Snap</p>
          </button>
          <button
            onClick={() => setActiveTab("type")}
            className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:bg-primary/10 hover:border-primary/50 active:scale-[0.97]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Type className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-semibold">⌨️ Type</p>
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 grid grid-cols-3 w-auto">
            <TabsTrigger value="search" className="gap-1.5 text-xs">
              <Search className="h-3.5 w-3.5" /> Search
            </TabsTrigger>
            <TabsTrigger value="type" className="gap-1.5 text-xs">
              <Type className="h-3.5 w-3.5" /> Type Meal
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Manual
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 px-4 mt-3">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search food..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            <div className="divide-y">
              {searchResults.map((food) => {
                const isLogged = loggedIds.has(food.fdcId);
                return (
                  <div key={food.fdcId} className="flex items-center py-3.5 gap-3">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setSelectedFood(food);
                        setServingCount("1");
                        setSelectedPortion(getDefaultPortion(food));
                      }}
                    >
                      <p className="font-medium text-sm truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🔥 {getDefaultCalories(food)} Cal • {getDefaultPortionLabel(food)}
                      </p>
                    </div>
                    <Button
                      variant={isLogged ? "default" : "outline"}
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); if (!isLogged) handleQuickAdd(food); }}
                      disabled={logMutation.isPending}
                    >
                      {isLogged ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                );
              })}
            </div>

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
            )}
          </TabsContent>

          {/* Type Meal Tab (AI Parser) */}
          <TabsContent value="type" className="px-4 mt-3 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Describe what you ate</Label>
              <div className="relative">
                <Input
                  placeholder='e.g. "Steak with eggs and avocado"'
                  value={typedMeal}
                  onChange={(e) => setTypedMeal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isParsing) handleTypeMeal(); }}
                  className="pr-12"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={handleTypeMeal}
                  disabled={isParsing || !typedMeal.trim()}
                >
                  {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                AI will parse ingredients, estimate portions, and calculate macros automatically.
              </p>
            </div>

            {isParsing && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing your meal...</p>
              </div>
            )}

            <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Try typing:</p>
              {["Grilled chicken with rice and broccoli", "2 eggs with bacon and avocado", "Salmon salad with olive oil"].map((example) => (
                <button
                  key={example}
                  className="block w-full text-left text-xs text-primary/80 hover:text-primary py-1"
                  onClick={() => setTypedMeal(example)}
                >
                  "{example}"
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Manual Add Tab */}
          <TabsContent value="manual" className="px-4 mt-3 space-y-4">
            <div className="space-y-2">
              <Label>Food Name *</Label>
              <Input placeholder="e.g., Chicken Breast" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Calories</Label>
                <Input type="number" placeholder="0" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input type="number" step="0.1" placeholder="0" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input type="number" step="0.1" placeholder="0" value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fats (g)</Label>
                <Input type="number" step="0.1" placeholder="0" value={manualFats} onChange={(e) => setManualFats(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleManualAdd} disabled={logMutation.isPending}>
              {logMutation.isPending ? "Logging..." : "Review & Log"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* Food Detail Drawer (USDA search) */}
      <Drawer open={!!selectedFood} onOpenChange={(open) => { if (!open) setSelectedFood(null); }}>
        <DrawerContent className="max-h-[85vh]">
          {selectedFood && (
            <div className="p-4 space-y-4">
              <DrawerHeader className="p-0">
                <p className="text-xs text-muted-foreground">Today, {format(new Date(), "h:mm a")}</p>
                <DrawerTitle className="text-lg">{selectedFood.name}</DrawerTitle>
              </DrawerHeader>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>Number of Serving</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={servingCount}
                    onChange={(e) => setServingCount(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Measurement</Label>
                  <Select value={selectedPortion} onValueChange={setSelectedPortion}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFood.portions.map((p) => (
                        <SelectItem key={p.unit} value={p.unit}>{p.unit}</SelectItem>
                      ))}
                      {selectedFood.portions.length === 0 && (
                        <SelectItem value="100g">100g</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Macro summary bar */}
              <div className="grid grid-cols-4 gap-2 bg-muted/50 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">🔥 {scaledMacros.calories}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{scaledMacros.protein}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{scaledMacros.carbs}g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{scaledMacros.fats}g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>

              <Button className="w-full h-12 text-base" onClick={handleLogFromSheet} disabled={logMutation.isPending}>
                {logMutation.isPending ? "Logging..." : "Review & Log"}
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Unified Confirmation Drawer */}
      <MealConfirmationDrawer
        meal={pendingMeal}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmMeal}
        isLogging={logMutation.isPending}
      />

      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onProductScanned={handleProductScanned} />
      <FoodPhotoAnalyzerDialog open={photoAnalyzerOpen} onOpenChange={setPhotoAnalyzerOpen} onAnalysisComplete={handlePhotoAnalyzed} />
    </ClientLayout>
  );
}
