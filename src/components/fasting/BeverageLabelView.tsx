import { Zap } from "lucide-react";

interface Props {
  details?: Record<string, any> | null;
  compact?: boolean;
}

export function BeverageLabelView({ details, compact = false }: Props) {
  if (!details || Object.keys(details).length === 0) return null;

  const elec = details.electrolytes || {};
  const sodium = Number(elec.sodium_mg) || 0;
  const potassium = Number(elec.potassium_mg) || 0;
  const magnesium = Number(elec.magnesium_mg) || 0;
  const calcium = Number(elec.calcium_mg) || 0;
  const caffeine = Number(details.caffeine_mg) || 0;
  const sugar = Number(details.sugar_g) || 0;
  const addedSugar = Number(details.added_sugar_g) || 0;
  const fiber = Number(details.fiber_g) || 0;
  const vitamins = Array.isArray(details.vitamins) ? details.vitamins : [];
  const aminos = Array.isArray(details.aminos) ? details.aminos : [];
  const other = Array.isArray(details.other) ? details.other : [];

  const hasElec = sodium || potassium || magnesium || calcium;
  const hasExtras = caffeine || sugar || addedSugar || fiber;
  const hasAny = hasElec || hasExtras || vitamins.length || aminos.length || other.length;
  if (!hasAny) return null;

  return (
    <div className={compact ? "space-y-2 text-xs" : "space-y-3 text-sm"}>
      {details.serving && (
        <p className="text-muted-foreground">Serving: <span className="text-foreground font-medium">{details.serving}</span></p>
      )}

      {hasElec && (
        <div>
          <p className="font-semibold text-foreground mb-1">Electrolytes</p>
          <div className="flex flex-wrap gap-1.5">
            {sodium > 0 && <Chip label={`Na ${sodium}mg`} />}
            {potassium > 0 && <Chip label={`K ${potassium}mg`} />}
            {magnesium > 0 && <Chip label={`Mg ${magnesium}mg`} />}
            {calcium > 0 && <Chip label={`Ca ${calcium}mg`} />}
          </div>
        </div>
      )}

      {(caffeine > 0 || sugar > 0 || addedSugar > 0 || fiber > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {caffeine > 0 && <Chip label={`☕ ${caffeine}mg caffeine`} />}
          {sugar > 0 && <Chip label={`Sugar ${sugar}g`} />}
          {addedSugar > 0 && <Chip label={`Added ${addedSugar}g`} />}
          {fiber > 0 && <Chip label={`Fiber ${fiber}g`} />}
        </div>
      )}

      {vitamins.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-1">Vitamins</p>
          <div className="flex flex-wrap gap-1.5">
            {vitamins.map((v: any, i: number) => (
              <Chip key={i} label={`${v.name} ${v.amount}${v.unit}${v.dv_pct ? ` (${v.dv_pct}% DV)` : ""}`} />
            ))}
          </div>
        </div>
      )}

      {aminos.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-1 flex items-center gap-1"><Zap className="h-3 w-3" /> Amino Acids</p>
          <div className="flex flex-wrap gap-1.5">
            {aminos.map((a: any, i: number) => (
              <Chip key={i} label={`${a.name} ${a.amount_mg}mg`} />
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <p className="font-semibold text-foreground mb-1">Other</p>
          <div className="flex flex-wrap gap-1.5">
            {other.map((o: any, i: number) => (
              <Chip key={i} label={`${o.name} ${o.amount}${o.unit}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-foreground/80 text-xs font-medium">
      {label}
    </span>
  );
}