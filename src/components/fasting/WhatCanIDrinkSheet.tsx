import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { SAFE_SUBCATEGORIES, type BeverageCategoryKey } from "@/lib/beverageCategories";
import { BeverageCategorySheet } from "./BeverageCategorySheet";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  activeFastStartAt?: string | null;
}

export function WhatCanIDrinkSheet({ open, onOpenChange, clientId, activeFastStartAt }: Props) {
  const [activeCategory, setActiveCategory] = useState<BeverageCategoryKey | null>(null);
  const [safeExpanded, setSafeExpanded] = useState(true);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-black">What Can I Drink?</SheetTitle>
            <SheetDescription>Tap a category to save & log your favorites</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3 pb-6">
            {/* SAFE — expandable */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setSafeExpanded((v) => !v)}
                className="w-full p-4 flex items-start justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-emerald-500">Safe</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                      5 categories — pick favorites, scan, or snap a photo
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold whitespace-nowrap text-emerald-500">0 cal</span>
              </button>

              {safeExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {SAFE_SUBCATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setActiveCategory(c.key)}
                      className="w-full flex items-center gap-3 rounded-xl bg-background/60 border border-emerald-500/20 p-3 text-left hover:bg-background/90 active:scale-[0.99] transition"
                    >
                      <span className="text-xl">{c.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{c.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.hint}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CAUTION */}
            <button
              type="button"
              onClick={() => setActiveCategory("caution")}
              className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-amber-500">Caution</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                      Lemon water, electrolytes, keto drinks
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold whitespace-nowrap text-amber-500">1–49 cal</span>
              </div>
            </button>

            {/* BREAKS FAST */}
            <button
              type="button"
              onClick={() => setActiveCategory("breaks_fast")}
              className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-red-500">Breaks Fast</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                      Bone broth, protein shakes, juice, cream
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold whitespace-nowrap text-red-500">50+ cal</span>
              </div>
            </button>

            <p className="text-[11px] text-center text-muted-foreground pt-2">
              General guidance. Strict fasting allows zero calories.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {activeCategory && (
        <BeverageCategorySheet
          open={!!activeCategory}
          onOpenChange={(v) => !v && setActiveCategory(null)}
          category={activeCategory}
          clientId={clientId}
          activeFastStartAt={activeFastStartAt}
        />
      )}
    </>
  );
}
