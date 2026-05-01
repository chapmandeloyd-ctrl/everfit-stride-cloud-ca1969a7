import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ROWS = [
  {
    key: "safe",
    title: "Safe",
    items: "Black coffee, plain water, green tea, sparkling water",
    cal: "0 cal",
    Icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    key: "caution",
    title: "Caution",
    items: "Lemon water, electrolytes, keto drinks — small amounts OK",
    cal: "1–49 cal",
    Icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    key: "breaks",
    title: "Breaks Fast",
    items: "Bone broth, protein shakes, cream in coffee, juice",
    cal: "50+ cal",
    Icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
];

export function WhatCanIDrinkSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl font-black">What Can I Drink?</SheetTitle>
          <SheetDescription>Fasting-safe beverage guide</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 pb-6">
          {ROWS.map(({ key, title, items, cal, Icon, color, bg, border }) => (
            <div key={key} className={`rounded-2xl border ${border} ${bg} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
                  <div className="min-w-0">
                    <h3 className={`font-bold text-base ${color}`}>{title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{items}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${color}`}>{cal}</span>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-center text-muted-foreground pt-2">
            General guidance. Strict fasting protocols allow zero calories.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}