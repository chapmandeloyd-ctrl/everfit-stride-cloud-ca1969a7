export type BeverageCategoryKey =
  | "zero_sugar_soda"
  | "zero_cal_energy"
  | "zero_cal_bcaa"
  | "black_coffee_splenda"
  | "tea_lemon_splenda"
  | "zero_sugar_creamer"
  | "caution"
  | "breaks_fast";

export const SAFE_SUBCATEGORIES: { key: BeverageCategoryKey; label: string; emoji: string; hint: string }[] = [
  { key: "zero_sugar_soda",      label: "Zero-Sugar Soda",         emoji: "🥤", hint: "Diet Coke, Coke Zero, Pepsi Zero" },
  { key: "zero_cal_energy",      label: "0–10 cal Energy Drink",   emoji: "⚡", hint: "Celsius, Bang, Monster Zero" },
  { key: "zero_cal_bcaa",        label: "0–10 cal BCAA",           emoji: "💪", hint: "Xtend, Scivation, Optimum BCAA" },
  { key: "black_coffee_splenda", label: "Black Coffee + Splenda",  emoji: "☕", hint: "Sweetener only — no cream" },
  { key: "tea_lemon_splenda",    label: "Tea + Lemon/Splenda",     emoji: "🍋", hint: "Black, green, herbal" },
  { key: "zero_sugar_creamer",   label: "0–15 cal Zero-Sugar Creamer", emoji: "🥛", hint: "Premier Protein, Nutpods, Califia zero" },
];

export const ALL_CATEGORIES: Record<BeverageCategoryKey, { label: string; emoji: string }> = {
  zero_sugar_soda:      { label: "Zero-Sugar Soda",        emoji: "🥤" },
  zero_cal_energy:      { label: "0–10 cal Energy",        emoji: "⚡" },
  zero_cal_bcaa:        { label: "0–10 cal BCAA",          emoji: "💪" },
  black_coffee_splenda: { label: "Black Coffee + Splenda", emoji: "☕" },
  tea_lemon_splenda:    { label: "Tea + Lemon/Splenda",    emoji: "🍋" },
  zero_sugar_creamer:   { label: "Zero-Sugar Creamer",     emoji: "🥛" },
  caution:              { label: "Caution",                emoji: "⚠️" },
  breaks_fast:          { label: "Breaks Fast",            emoji: "❌" },
};
