import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KETO_TYPES, type KetoTypeCode } from "@/lib/ketoTypes";

export function KetoTypeSheet({
  code,
  open,
  onOpenChange,
}: {
  code: KetoTypeCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const meta = code ? KETO_TYPES[code] : null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/40 bg-card max-h-[85vh] overflow-y-auto">
        {meta && (
          <>
            <SheetHeader className="text-left">
              <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${meta.bg} ${meta.color}`}>
                {meta.code}
              </div>
              <SheetTitle className="text-2xl">{meta.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{meta.tagline}</p>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-foreground/85">{meta.description}</p>

              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Macro split</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "Fat", v: meta.macros.fat },
                    { k: "Protein", v: meta.macros.protein },
                    { k: "Carbs", v: meta.macros.carbs },
                  ].map((m) => (
                    <div key={m.k} className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-center">
                      <div className="text-[10px] uppercase text-muted-foreground">{m.k}</div>
                      <div className="text-sm font-bold">{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Best for</div>
                <div className="flex flex-wrap gap-1.5">
                  {meta.bestFor.map((b) => (
                    <span key={b} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">{b}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sample foods</div>
                <ul className="space-y-1.5">
                  {meta.sampleFoods.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${meta.color.replace("text-", "bg-")} flex-shrink-0`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}